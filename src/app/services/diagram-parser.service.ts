import { Injectable } from '@angular/core';

export interface Annotation {
  id?: string;
  content: string;
  [key: string]: any;
}

export interface NodeData {
  path: string;
  title: string;
  actualdata: string;
  displayContent?: any;
}

export interface DiagramNode {
  id: string;
  width?: number;
  height?: number;
  annotations: Annotation[];
  additionalInfo: {
    isLeaf: boolean;
    mergedContent?: string;
  };
  data: NodeData;
  [key: string]: any;
}

export interface DiagramConnector {
  id: string;
  sourceID: string;
  targetID: string;
  [key: string]: any;
}

export interface DiagramData {
  nodes: DiagramNode[];
  connectors: DiagramConnector[];
}

@Injectable({ providedIn: 'root' })
export class DiagramParserService {
  private readonly DEFAULT_NODE_WIDTH = 150;
  private readonly DEFAULT_NODE_HEIGHT = 50;

  constructor() {}

  // Main entry point to convert JSON data into diagram nodes and connectors
  public processJson(jsonData: any): DiagramData {
    const parsedDiagramData: DiagramData = { nodes: [], connectors: [] };
    
    if (!this.isValidJsonData(jsonData)) {
      return parsedDiagramData;
    }

    const processedData = this.preprocessJsonData(jsonData);
    const { processedJson, rootNodeIdentifier, shouldSkipEmptyRoot } = processedData;
    
    const categorizedKeys = this.categorizeObjectKeys(processedJson);
    const { nonLeafPropertyKeys, primitivePropertyKeys } = categorizedKeys;

    const isRootNodeCreated = this.processRootNode(
      processedJson, 
      primitivePropertyKeys, 
      rootNodeIdentifier, 
      shouldSkipEmptyRoot, 
      parsedDiagramData
    );

    this.processNonLeafProperties(
      processedJson,
      nonLeafPropertyKeys,
      rootNodeIdentifier,
      isRootNodeCreated,
      parsedDiagramData
    );

    this.handleMultipleRootNodes(parsedDiagramData, shouldSkipEmptyRoot, isRootNodeCreated);

    return parsedDiagramData;
  }

  // Validate if the input JSON data is valid for processing
  private isValidJsonData(jsonData: any): boolean {
    return jsonData && 
           typeof jsonData === 'object' && 
           !Array.isArray(jsonData) && 
           Object.keys(jsonData).length > 0;
  }

  // Preprocess JSON data to handle single root key scenarios
  private preprocessJsonData(jsonData: any): { processedJson: any, rootNodeIdentifier: string, shouldSkipEmptyRoot: boolean } {
    let rootNodeIdentifier = 'root';
    let processedJson = jsonData;
    let shouldSkipEmptyRoot = false;

    const objectKeys = Object.keys(jsonData);
    
    if (objectKeys.length === 1) {
      const singleRootKey = objectKeys[0];
      const rootValue = jsonData[singleRootKey];
      
      if (this.isEmptyOrWhitespace(singleRootKey) && rootValue && typeof rootValue === 'object') {
        shouldSkipEmptyRoot = true;
        processedJson = rootValue;
      } else if (!this.isEmptyOrWhitespace(singleRootKey) && rootValue && typeof rootValue === 'object') {
        rootNodeIdentifier = singleRootKey;
      }
    }

    return { processedJson, rootNodeIdentifier, shouldSkipEmptyRoot };
  }

  // Categorize object keys into primitive and non-leaf properties
  private categorizeObjectKeys(jsonData: any): { nonLeafPropertyKeys: string[], primitivePropertyKeys: string[] } {
    const nonLeafPropertyKeys: string[] = [];
    const primitivePropertyKeys: string[] = [];
    
    Object.keys(jsonData).forEach(propertyKey => {
      const propertyValue = jsonData[propertyKey];
      if (propertyValue !== null && typeof propertyValue === 'object') {
        nonLeafPropertyKeys.push(propertyKey);
      } else {
        primitivePropertyKeys.push(propertyKey);
      }
    });

    return { nonLeafPropertyKeys, primitivePropertyKeys };
  }

  // Process root node creation for primitive properties
  private processRootNode(
    jsonData: any,
    primitivePropertyKeys: string[],
    rootNodeIdentifier: string,
    shouldSkipEmptyRoot: boolean,
    parsedDiagramData: DiagramData
  ): boolean {
    if (primitivePropertyKeys.length === 0) {
      return false;
    }

    const finalRootId = shouldSkipEmptyRoot ? 'data-root' : this.convertUnderScoreToPascalCase(rootNodeIdentifier);
    const leafNodeAnnotations = this.createPrimitiveAnnotations(jsonData, primitivePropertyKeys);
    const mergedPrimitiveContent = this.createMergedPrimitiveContent(jsonData, primitivePropertyKeys);

    parsedDiagramData.nodes.push({
      id: finalRootId,
      width: this.DEFAULT_NODE_WIDTH,
      height: this.DEFAULT_NODE_HEIGHT,
      annotations: leafNodeAnnotations,
      additionalInfo: { isLeaf: true },
      data: { path: 'Root', title: mergedPrimitiveContent, actualdata: mergedPrimitiveContent }
    });

    return true;
  }

  // Create annotations for primitive key-value pairs
  private createPrimitiveAnnotations(jsonData: any, primitiveKeys: string[]): Annotation[] {
    return primitiveKeys.flatMap(primitiveKey => {
      const rawValue = jsonData[primitiveKey] == null ? '' : String(jsonData[primitiveKey]);
      const keyValueAnnotations: Annotation[] = [{ id: `Key_${primitiveKey}`, content: `${primitiveKey}:` }];
      keyValueAnnotations.push({ id: `Value_${primitiveKey}`, content: rawValue });
      return keyValueAnnotations;
    });
  }

  // Create merged content string for primitive properties
  private createMergedPrimitiveContent(jsonData: any, primitiveKeys: string[]): string {
    return primitiveKeys
      .map(primitiveKey => `${primitiveKey}: ${jsonData[primitiveKey]}`)
      .join('\n');
  }

  // Process non-leaf properties and create their nodes
  private processNonLeafProperties(
    jsonData: any,
    nonLeafPropertyKeys: string[],
    rootNodeIdentifier: string,
    isRootNodeCreated: boolean,
    parsedDiagramData: DiagramData
  ): void {
    nonLeafPropertyKeys.forEach(nonLeafKey => {
      if (this.isEmpty(jsonData[nonLeafKey])) return;
      
      const childNodeId = this.createNonLeafNode(jsonData, nonLeafKey, parsedDiagramData);
      
      if (isRootNodeCreated) {
        this.createConnector(rootNodeIdentifier, childNodeId, parsedDiagramData);
      }

      this.processNestedJsonData(
        jsonData[nonLeafKey],
        childNodeId,
        parsedDiagramData.nodes,
        parsedDiagramData.connectors,
        `Root.${nonLeafKey}`,
        nonLeafKey
      );
    });
  }

  // Create a non-leaf node and return its ID
  private createNonLeafNode(jsonData: any, nonLeafKey: string, parsedDiagramData: DiagramData): string {
    const childNodeId = this.convertUnderScoreToPascalCase(nonLeafKey);
    const childrenCount = this.getObjectLength(jsonData[nonLeafKey]);
    const nonLeafAnnotations: Annotation[] = [{ content: nonLeafKey }];
    
    if (childrenCount > 0) {
      nonLeafAnnotations.push({ content: `{${childrenCount}}` });
    }

    parsedDiagramData.nodes.push({
      id: childNodeId,
      width: this.DEFAULT_NODE_WIDTH,
      height: this.DEFAULT_NODE_HEIGHT,
      annotations: nonLeafAnnotations,
      additionalInfo: { isLeaf: false, mergedContent: `${nonLeafKey} {${childrenCount}}` },
      data: {
        path: `Root.${nonLeafKey}`,
        title: nonLeafKey,
        actualdata: nonLeafKey,
        displayContent: { key: [nonLeafKey], displayValue: childrenCount }
      }
    });

    return childNodeId;
  }

  // Create a connector between two nodes
  private createConnector(sourceId: string, targetId: string, parsedDiagramData: DiagramData): void {
    parsedDiagramData.connectors.push({
      id: `connector-${sourceId}-${targetId}`,
      sourceID: sourceId,
      targetID: targetId
    });
  }

  // Handle multiple root nodes scenario
  private handleMultipleRootNodes(
    parsedDiagramData: DiagramData,
    shouldSkipEmptyRoot: boolean,
    isRootNodeCreated: boolean
  ): void {
    const hasMultipleRoots = this.hasMultipleRootNodes(parsedDiagramData.nodes, parsedDiagramData.connectors);
    
    if ((shouldSkipEmptyRoot || hasMultipleRoots) && !isRootNodeCreated) {
      this.createMainRootForMultipleRoots(parsedDiagramData.nodes, parsedDiagramData.connectors);
    }
  }

  // Recursively process nested JSON objects and arrays to create child nodes and connectors
  private processNestedJsonData(
    nestedElement: any,
    parentNodeId: string,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    if (!nestedElement || typeof nestedElement !== 'object') return;

    if (Array.isArray(nestedElement)) {
      this.processArrayElements(nestedElement, parentNodeId, diagramNodes, diagramConnectors, currentPath, currentKeyName);
      return;
    }

    this.processObjectElements(nestedElement, parentNodeId, diagramNodes, diagramConnectors, currentPath);
  }

  // Process array elements and create corresponding nodes
  private processArrayElements(
    arrayElement: any[],
    parentNodeId: string,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    arrayElement.forEach((arrayItem, arrayIndex) => {
      if (arrayItem == null) return;
      
      const arrayItemNodeId = this.convertUnderScoreToPascalCase(`${parentNodeId}-${arrayIndex}`);
      
      if (this.isComplexArrayItem(arrayItem)) {
        this.processComplexArrayItem(
          arrayItem,
          arrayItemNodeId,
          parentNodeId,
          arrayIndex,
          diagramNodes,
          diagramConnectors,
          currentPath,
          currentKeyName
        );
      } else {
        this.processPrimitiveArrayItem(
          arrayItem,
          arrayItemNodeId,
          parentNodeId,
          arrayIndex,
          diagramNodes,
          diagramConnectors,
          currentPath,
          currentKeyName
        );
      }
    });
  }

  // Check if array item is a complex object
  private isComplexArrayItem(arrayItem: any): boolean {
    return arrayItem && typeof arrayItem === 'object' && !Array.isArray(arrayItem);
  }

  // Process complex array item (object)
  private processComplexArrayItem(
    arrayItem: any,
    arrayItemNodeId: string,
    parentNodeId: string,
    arrayIndex: number,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    const objectEntries = Object.entries(arrayItem);
    const primitiveEntries = objectEntries.filter(([, value]) => value === null || typeof value !== 'object');
    const nestedObjectEntries = objectEntries.filter(([, value]) => value && typeof value === 'object' && !this.isEmpty(value));

    const requiresIntermediateNode = primitiveEntries.length > 0 || nestedObjectEntries.length > 1;

    if (requiresIntermediateNode) {
      this.createIntermediateArrayNode(
        arrayItem,
        arrayItemNodeId,
        parentNodeId,
        arrayIndex,
        primitiveEntries,
        nestedObjectEntries,
        diagramNodes,
        diagramConnectors,
        currentPath,
        currentKeyName
      );
    } else {
      this.createDirectArrayNode(
        nestedObjectEntries[0],
        arrayItemNodeId,
        parentNodeId,
        arrayIndex,
        diagramNodes,
        diagramConnectors,
        currentPath,
        currentKeyName
      );
    }
  }

  // Create intermediate node for complex array items
  private createIntermediateArrayNode(
    arrayItem: any,
    arrayItemNodeId: string,
    parentNodeId: string,
    arrayIndex: number,
    primitiveEntries: [string, any][],
    nestedObjectEntries: [string, any][],
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    let nodeContentText: string;
    let isLeafNode: boolean;
    let nodeAnnotations: Annotation[];

    if (primitiveEntries.length > 0) {
      isLeafNode = true;
      nodeAnnotations = this.createArrayItemPrimitiveAnnotations(primitiveEntries, arrayItemNodeId);
      nodeContentText = primitiveEntries.map(([key, value]) => `${key}: ${value}`).join('\n');
    } else {
      isLeafNode = false;
      nodeContentText = `Item ${arrayIndex}`;
      nodeAnnotations = [{ content: nodeContentText }];
    }

    diagramNodes.push({
      id: arrayItemNodeId,
      width: this.DEFAULT_NODE_WIDTH,
      height: this.DEFAULT_NODE_HEIGHT,
      annotations: nodeAnnotations,
      additionalInfo: { isLeaf: isLeafNode },
      data: {
        path: `${currentPath}/${currentKeyName}[${arrayIndex}]`,
        title: nodeContentText,
        actualdata: nodeContentText
      }
    });

    diagramConnectors.push({
      id: `connector-${parentNodeId}-${arrayItemNodeId}`,
      sourceID: parentNodeId,
      targetID: arrayItemNodeId
    });

    this.processNestedObjectEntries(
      nestedObjectEntries,
      arrayItemNodeId,
      arrayIndex,
      diagramNodes,
      diagramConnectors,
      currentPath,
      currentKeyName
    );
  }

  // Create annotations for array item primitive properties
  private createArrayItemPrimitiveAnnotations(primitiveEntries: [string, any][], arrayItemNodeId: string): Annotation[] {
    return primitiveEntries.flatMap(([primitiveKey, primitiveValue]) => {
      const stringValue = String(primitiveValue);
      const keyValueAnnotations: Annotation[] = [{ id: `Key_${arrayItemNodeId}_${primitiveKey}`, content: `${primitiveKey}:` }];
      keyValueAnnotations.push({ id: `Value_${arrayItemNodeId}_${primitiveKey}`, content: stringValue });
      return keyValueAnnotations;
    });
  }

  // Process nested object entries for array items
  private processNestedObjectEntries(
    nestedObjectEntries: [string, any][],
    arrayItemNodeId: string,
    arrayIndex: number,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    nestedObjectEntries.forEach(([nestedKey, nestedValue]) => {
      const nestedNodeId = this.convertUnderScoreToPascalCase(`${arrayItemNodeId}-${nestedKey}`);
      const nestedChildrenCount = this.getObjectLength(nestedValue);
      const nestedNodeAnnotations: Annotation[] = [{ content: nestedKey }];
      
      if (nestedChildrenCount > 0) {
        nestedNodeAnnotations.push({ content: `{${nestedChildrenCount}}` });
      }

      diagramNodes.push({
        id: nestedNodeId,
        width: this.DEFAULT_NODE_WIDTH,
        height: this.DEFAULT_NODE_HEIGHT,
        annotations: nestedNodeAnnotations,
        additionalInfo: { isLeaf: false, mergedContent: `${nestedKey} {${nestedChildrenCount}}` },
        data: {
          path: `${currentPath}/${currentKeyName}[${arrayIndex}].${nestedKey}`,
          title: nestedKey,
          actualdata: nestedKey
        }
      });

      diagramConnectors.push({
        id: `connector-${arrayItemNodeId}-${nestedNodeId}`,
        sourceID: arrayItemNodeId,
        targetID: nestedNodeId
      });

      this.processNestedJsonData(
        nestedValue,
        nestedNodeId,
        diagramNodes,
        diagramConnectors,
        `${currentPath}/${currentKeyName}[${arrayIndex}].${nestedKey}`,
        nestedKey
      );
    });
  }

  // Create direct node for single nested object in array
  private createDirectArrayNode(
    nestedEntry: [string, any],
    arrayItemNodeId: string,
    parentNodeId: string,
    arrayIndex: number,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    const [singleNestedKey, singleNestedValue] = nestedEntry;
    const directChildNodeId = this.convertUnderScoreToPascalCase(`${arrayItemNodeId}-${singleNestedKey}`);
    const directChildrenCount = this.getObjectLength(singleNestedValue);
    const directChildAnnotations: Annotation[] = [{ content: singleNestedKey }];
    
    if (directChildrenCount > 0) {
      directChildAnnotations.push({ content: `{${directChildrenCount}}` });
    }

    diagramNodes.push({
      id: directChildNodeId,
      width: this.DEFAULT_NODE_WIDTH,
      height: this.DEFAULT_NODE_HEIGHT,
      annotations: directChildAnnotations,
      additionalInfo: { isLeaf: false, mergedContent: `${singleNestedKey} {${directChildrenCount}}` },
      data: {
        path: `${currentPath}/${currentKeyName}[${arrayIndex}].${singleNestedKey}`,
        title: singleNestedKey,
        actualdata: singleNestedKey
      }
    });

    diagramConnectors.push({
      id: `connector-${parentNodeId}-${directChildNodeId}`,
      sourceID: parentNodeId,
      targetID: directChildNodeId
    });

    this.processNestedJsonData(
      singleNestedValue,
      directChildNodeId,
      diagramNodes,
      diagramConnectors,
      `${currentPath}/${currentKeyName}[${arrayIndex}].${singleNestedKey}`,
      singleNestedKey
    );
  }

  // Process primitive array item
  private processPrimitiveArrayItem(
    arrayItem: any,
    arrayItemNodeId: string,
    parentNodeId: string,
    arrayIndex: number,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string,
    currentKeyName: string
  ): void {
    const primitiveContent = String(arrayItem);
    
    diagramNodes.push({
      id: arrayItemNodeId,
      width: this.DEFAULT_NODE_WIDTH,
      height: this.DEFAULT_NODE_HEIGHT,
      annotations: [{ content: primitiveContent }],
      additionalInfo: { isLeaf: true },
      data: {
        path: `${currentPath}/${currentKeyName}[${arrayIndex}]`,
        title: primitiveContent,
        actualdata: primitiveContent
      }
    });
    
    diagramConnectors.push({
      id: `connector-${parentNodeId}-${arrayItemNodeId}`,
      sourceID: parentNodeId,
      targetID: arrayItemNodeId
    });
  }

  // Process object elements and create corresponding nodes
  private processObjectElements(
    nestedElement: any,
    parentNodeId: string,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string
  ): void {
    const allObjectEntries = Object.entries(nestedElement);
    const primitiveKeys = allObjectEntries.filter(([, value]) => value === null || typeof value !== 'object').map(([key]) => key);
    const objectKeys = allObjectEntries.filter(([, value]) => value && typeof value === 'object').map(([key]) => key);

    if (primitiveKeys.length > 0) {
      this.createLeafNodeForPrimitives(primitiveKeys, nestedElement, parentNodeId, diagramNodes, diagramConnectors, currentPath);
    }

    this.processObjectProperties(objectKeys, nestedElement, parentNodeId, diagramNodes, diagramConnectors, currentPath);
  }

  // Create leaf node for primitive properties in nested object
  private createLeafNodeForPrimitives(
    primitiveKeys: string[],
    nestedElement: any,
    parentNodeId: string,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string
  ): void {
    const leafNodeId = this.convertUnderScoreToPascalCase(`${parentNodeId}-leaf`);
    const leafNodeAnnotations = primitiveKeys.flatMap(primitiveKey => {
      const rawPrimitiveValue = String(nestedElement[primitiveKey]);
      const primitiveKeyValueAnnotations: Annotation[] = [{ id: `Key_${leafNodeId}_${primitiveKey}`, content: `${primitiveKey}:` }];
      primitiveKeyValueAnnotations.push({ id: `Value_${leafNodeId}_${primitiveKey}`, content: rawPrimitiveValue });
      return primitiveKeyValueAnnotations;
    });
    
    const mergedLeafContent = primitiveKeys
      .map(primitiveKey => `${primitiveKey}: ${nestedElement[primitiveKey]}`)
      .join('\n');

    diagramNodes.push({
      id: leafNodeId,
      width: this.DEFAULT_NODE_WIDTH,
      height: this.DEFAULT_NODE_HEIGHT,
      annotations: leafNodeAnnotations,
      additionalInfo: { isLeaf: true },
      data: {
        path: `${currentPath}.leaf`,
        title: mergedLeafContent,
        actualdata: mergedLeafContent
      }
    });
    
    diagramConnectors.push({
      id: `connector-${parentNodeId}-${leafNodeId}`,
      sourceID: parentNodeId,
      targetID: leafNodeId
    });
  }

  // Process object properties and create their nodes
  private processObjectProperties(
    objectKeys: string[],
    nestedElement: any,
    parentNodeId: string,
    diagramNodes: DiagramNode[],
    diagramConnectors: DiagramConnector[],
    currentPath: string
  ): void {
    objectKeys.forEach(objectPropertyKey => {
      const objectPropertyValue = nestedElement[objectPropertyKey];
      if (this.isEmpty(objectPropertyValue)) return;
      
      const objectChildrenCount = this.getObjectLength(objectPropertyValue);
      const objectChildNodeId = this.convertUnderScoreToPascalCase(`${parentNodeId}-${objectPropertyKey}`);
      const objectChildAnnotations: Annotation[] = [{ content: objectPropertyKey }];
      
      if (objectChildrenCount > 0) {
        objectChildAnnotations.push({ content: `{${objectChildrenCount}}` });
      }

      diagramNodes.push({
        id: objectChildNodeId,
        width: this.DEFAULT_NODE_WIDTH,
        height: this.DEFAULT_NODE_HEIGHT,
        annotations: objectChildAnnotations,
        additionalInfo: { isLeaf: false, mergedContent: `${objectPropertyKey} {${objectChildrenCount}}` },
        data: {
          path: `${currentPath}.${objectPropertyKey}`,
          title: objectPropertyKey,
          actualdata: objectPropertyKey
        }
      });
      
      diagramConnectors.push({
        id: `connector-${parentNodeId}-${objectChildNodeId}`,
        sourceID: parentNodeId,
        targetID: objectChildNodeId
      });
      
      this.processNestedJsonData(
        objectPropertyValue,
        objectChildNodeId,
        diagramNodes,
        diagramConnectors,
        `${currentPath}.${objectPropertyKey}`,
        objectPropertyKey
      );
    });
  }

  // Calculate the number of child elements in an object or array
  private getObjectLength(dataElement: any): number {
    if (!dataElement || typeof dataElement !== 'object') return 0;
    if (Array.isArray(dataElement)) return dataElement.length;

    const elementEntries = Object.entries(dataElement);
    const primitiveEntries = elementEntries.filter(([, value]) => value === null || typeof value !== 'object');
    const arrayEntries = elementEntries.filter(([, value]) => Array.isArray(value));
    const objectEntries = elementEntries.filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value));
    return (primitiveEntries.length > 0 ? 1 : 0) + arrayEntries.length + objectEntries.length;
  }

  // Convert underscore and hyphen separated strings to camelCase format
  private convertUnderScoreToPascalCase(inputString: string): string {
    if (!inputString) return inputString;
    return inputString
      .split('-')
      .map(segment =>
        segment.split('_')
          .map((word, wordIndex) =>
            wordIndex === 0
               ? word.toLowerCase()
               : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
           )
           .join('')
      )
      .join('-');
  }

  // Check if diagram has multiple root nodes (nodes without parents)
  private hasMultipleRootNodes(diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[]): boolean {
    const allNodeIds = diagramNodes.map(node => node.id);
    const nodesWithParents = new Set(diagramConnectors.map(connector => connector.targetID));
    const rootNodeIds = allNodeIds.filter(nodeId => !nodesWithParents.has(nodeId));
    return rootNodeIds.length > 1;
  }

  // Create artificial main root node to connect multiple root nodes
  private createMainRootForMultipleRoots(diagramNodes: DiagramNode[], diagramConnectors: DiagramConnector[]): void {
    const allNodeIds = diagramNodes.map(node => node.id);
    const nodesWithParents = new Set(diagramConnectors.map(connector => connector.targetID));
    const rootNodeIds = allNodeIds.filter(nodeId => !nodesWithParents.has(nodeId));
    
    if (rootNodeIds.length > 1) {
      const mainRootNodeId = 'main-root';
      diagramNodes.push({
        id: mainRootNodeId,
        width: 40,
        height: 40,
        annotations: [{ content: '' }],
        additionalInfo: { isLeaf: false },
        data: { path: 'MainRoot', title: 'Main Artificial Root', actualdata: '' }
      });
      
      rootNodeIds.forEach(rootNodeId => {
        diagramConnectors.push({
          id: `connector-${mainRootNodeId}-${rootNodeId}`,
          sourceID: mainRootNodeId,
          targetID: rootNodeId
        });
      });
    }
  }

  // Check if a value is empty (empty array or empty object)
  private isEmpty(dataValue: any): boolean {
    if (Array.isArray(dataValue)) return dataValue.length === 0;
    if (dataValue && typeof dataValue === 'object') return Object.keys(dataValue).length === 0;
    return false;
  }

  // Check if a string is null, undefined, or contains only whitespace
  private isEmptyOrWhitespace(inputString: string): boolean {
    return !inputString || inputString.trim().length === 0;
  }
}