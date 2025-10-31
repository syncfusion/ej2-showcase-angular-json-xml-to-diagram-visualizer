import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {
  DiagramComponent as EJ2Diagram,
  NodeModel,
  ConnectorModel,
  DiagramTools,
  LayoutModel,
  Annotation,
  ShapeAnnotation,
  Node,
  SnapSettingsModel,
  SnapConstraints,
  IExpandStateChangeEventArgs
} from '@syncfusion/ej2-angular-diagrams';
import {
  NodeConstraints,
  ConnectorConstraints,
  ConnectionPointOrigin
} from '@syncfusion/ej2-angular-diagrams';
import { DiagramNode } from '../../services/diagram-parser.service';
import themeService from '../../services/theme.service';
import { HamburgerComponent } from '../hamburger/hamburger.component';

@Component({
  selector: 'app-diagram',
  template: `
    <ejs-diagram
      id="diagram"
      #diagramRef
      width="100%"
      height="100%"
      backgroundColor="#F8F9FA"
      [tool]="diagramTools"
      [layout]="layout"
      [getNodeDefaults]="getNodeDefaults.bind(this)"
      [getConnectorDefaults]="getConnectorDefaults.bind(this)"
      (expandStateChange)="handleExpandStateChange($event)"
      [nodes]="nodes"
      [connectors]="connectors"
      [snapSettings]="snapSettings"
      [scrollSettings]="{ scrollLimit: 'Infinity' }"
      (click)="onDiagramClick($event)"
    >
    </ejs-diagram>
  `,
  styles: [`
    :host { display:block; width:100%; height:100%; }
    #diagramcontent {
      overflow: hidden !important;
    }
  `],
  encapsulation: ViewEncapsulation.None,
})
export class DiagramComponent implements OnInit {
  @ViewChild('diagramRef', { static: false, read: EJ2Diagram }) public diagram!: EJ2Diagram;
  @Input() nodes: NodeModel[] = [];
  @Input() connectors: ConnectorModel[] = [];
  @Output() nodeClicked = new EventEmitter<{ content: string; path: string }>();
  @Output() searchStats = new EventEmitter<{ current: number; total: number; }>();

  public diagramTools!: DiagramTools;
  public layout!: LayoutModel;
  public snapSettings!: SnapSettingsModel;
  orientationIndex = 0;
  isGraphCollapsed = false;
  showExpandCollapseIcon = true;
  showChildItemsCount = true;
  searchMatchIds: string[] = [];
  searchMatchIndex = 0;
  currentOrientation:
    | 'LeftToRight'
    | 'RightToLeft'
    | 'TopToBottom'
    | 'BottomToTop' = 'LeftToRight';
  orientations: Array<
    'LeftToRight' | 'TopToBottom' | 'RightToLeft' | 'BottomToTop'
  > = ['LeftToRight', 'TopToBottom', 'RightToLeft', 'BottomToTop'];
  currentThemeSettings = themeService.getCurrentThemeSettings();

  ngOnInit(): void {
    // configure diagram tools
    this.diagramTools = DiagramTools.ZoomPan | DiagramTools.SingleSelect;

    // configure diagram snap settings, with gridlines color based on current theme
    this.snapSettings = {
      constraints: SnapConstraints.ShowLines,
      horizontalGridlines: {
        lineColor: this.currentThemeSettings.gridlinesColor,
      },
      verticalGridlines: {
        lineColor: this.currentThemeSettings.gridlinesColor,
      },
    };

    // configure diagram layout
    this.layout = {
      type: 'HierarchicalTree',
      orientation: this.currentOrientation,
      horizontalSpacing: 30,
      verticalSpacing: 100,
      connectionPointOrigin: ConnectionPointOrigin.DifferentPoint,
    };
  }

  // Node Defaults
  getNodeDefaults(node: NodeModel): NodeModel {
    const isLeafNode = (node as DiagramNode).additionalInfo?.isLeaf === true;
    const isMainRootNode = node.id === 'main-root';
    const nodeFontSpecification = '12px Consolas';
    const textLineHeight = 16;
    const nodePadding = 10;
    const expandCollapseIconWidth = 36;
    const nodeCornerRadius = 3;

    // configure node constraints
    node.constraints =
      NodeConstraints.Default &
      ~(
        NodeConstraints.Rotate |
        NodeConstraints.Select |
        NodeConstraints.Resize |
        NodeConstraints.Delete |
        NodeConstraints.Drag
      );

    // configure node shape and style
    node.shape = {
      type: 'Basic',
      shape: isMainRootNode ? 'Ellipse' : 'Rectangle',
      cornerRadius: nodeCornerRadius,
    };
    node.style = {
      fill: this.currentThemeSettings.nodeFillColor,
      strokeColor: this.currentThemeSettings.nodeStrokeColor,
      strokeWidth: 1.5,
    };

    // for main root node, set fixed size, else calculate size based on annotations
    if (isMainRootNode) {
      node.width = 40;
      node.height = 40;
    } else {
      const { width, height } = this.calculateNodeSize(
        node,
        nodeFontSpecification,
        nodePadding,
        textLineHeight,
        expandCollapseIconWidth
      );
      node.width = width;
      node.height = height;
    }

    // configure node annotations
    if (node.annotations) {
      // configure annotations positining and styling for leaf nodes(nodes that don't have any childs)
      if (isLeafNode) {
        this.layoutLeafAnnotations(node, nodeFontSpecification, nodePadding);
      } 
      // configure annotations positining and styling for non-leaf nodes(nodes that have childs)
      else if (node.annotations.length === 2) {
        const keyAnnotation = node.annotations[0];
        const countAnnotation = node.annotations[1];
        keyAnnotation.style = {
          fontSize: 12,
          fontFamily: 'Consolas',
          color: this.currentThemeSettings.textKeyColor,
        };
        keyAnnotation.offset = { x: this.showChildItemsCount ? 0 : 0.5, y: 0.5 };
        keyAnnotation.margin = {
          left: this.showChildItemsCount
            ? nodePadding
            : this.showExpandCollapseIcon
            ? -nodePadding
            : 0,
        };
        keyAnnotation.horizontalAlignment = this.showChildItemsCount
          ? 'Left'
          : 'Center';

        if (this.showChildItemsCount) {
          countAnnotation.visibility = true;
          countAnnotation.style = {
            fontSize: 12,
            fontFamily: 'Consolas',
            color: this.currentThemeSettings.textValueColor,
          };
          countAnnotation.offset = { x: 1, y: 0.5 };
          countAnnotation.horizontalAlignment = 'Right';
          countAnnotation.margin = {
            right:
              nodePadding + (this.showExpandCollapseIcon ? expandCollapseIconWidth : 0),
          };
        } else {
          countAnnotation.visibility = false;
        }
      }
    }
    // configure expand/collapse icons for non-leaf nodes
    if (!isLeafNode && !isMainRootNode && this.showExpandCollapseIcon) {
      const expandIcon = this.createIcon(
        'Minus',
        expandCollapseIconWidth,
        node.height!
      );
      const collapseIcon = this.createIcon(
        'Plus',
        expandCollapseIconWidth,
        node.height!
      );
      this.updateIconOffset(expandIcon);
      this.updateIconOffset(collapseIcon);
      node.expandIcon = expandIcon;
      node.collapseIcon = collapseIcon;
    } else {
      node.expandIcon = { shape: 'None' } as any;
      node.collapseIcon = { shape: 'None' } as any;
    }

    return node;
  }

  // Calculates node size based on annotations
  private calculateNodeSize(
    node: NodeModel,
    nodeFontSpecification: string,
    nodePadding: number,
    textLineHeight: number,
    expandCollapseIconWidth: number
  ) {
    const nodeAnnotations = node.annotations || [];
    const isLeafNode = (node as DiagramNode).additionalInfo?.isLeaf === true;
    const canvasContext = document.createElement('canvas').getContext('2d')!;
    canvasContext.font = nodeFontSpecification;
    let maximumTextWidth = 0,
      totalLinesCount = 0;

    if (isLeafNode) {
      const keyAnnotations = nodeAnnotations.filter((annotation) => annotation.id?.startsWith('Key'));
      const valueAnnotations = nodeAnnotations.filter((annotation) => annotation.id?.startsWith('Value'));
      totalLinesCount = keyAnnotations.length;
      for (let annotationIndex = 0; annotationIndex < keyAnnotations.length; annotationIndex++) {
        const combinedText = keyAnnotations[annotationIndex].content + '  ' + (valueAnnotations[annotationIndex]?.content || '');
        maximumTextWidth = Math.max(maximumTextWidth, canvasContext.measureText(combinedText).width);
      }
      if (keyAnnotations.length === 0) {
        maximumTextWidth = Math.max(
          maximumTextWidth,
          canvasContext.measureText(nodeAnnotations[0]?.content || '').width
        );
      }
    } else if (nodeAnnotations.length === 2) {
      const combinedAnnotationText = (nodeAnnotations[0] as Annotation).content + '  ' + nodeAnnotations[1].content;
      maximumTextWidth = canvasContext.measureText(combinedAnnotationText).width;
      totalLinesCount = 1;
    }

    const calculatedWidth = Math.max(
      maximumTextWidth + nodePadding * 2 + (isLeafNode ? 0 : expandCollapseIconWidth),
      50
    );
    const calculatedHeight = Math.max(totalLinesCount * textLineHeight + nodePadding * 2, 40);
    return { width: calculatedWidth, height: calculatedHeight };
  }

  // Position the annotations on the leaf nodes
  private layoutLeafAnnotations(
    node: NodeModel,
    nodeFontSpecification: string,
    nodePadding: number,
  ) {
    const nodeAnnotations = node.annotations as ShapeAnnotation[];
    const totalKeyAnnotations = nodeAnnotations.filter((annotation) => annotation.id?.startsWith('Key')).length;
    const verticalSpacing = totalKeyAnnotations > 0 ? 1 / (totalKeyAnnotations + 1) : 0.5;
    let currentLineNumber = 1;
    const canvasContext = document.createElement('canvas').getContext('2d')!;
    canvasContext.font = nodeFontSpecification;

    for (let annotationIndex = 0; annotationIndex < nodeAnnotations.length; annotationIndex++) {
      const currentAnnotation = nodeAnnotations[annotationIndex];
      if (!currentAnnotation.id) continue;
      const yPosition = verticalSpacing * currentLineNumber;
      // Position the key and value annotations side by side
      if (currentAnnotation.id.startsWith('Key')) {
        const keyTextWidth = canvasContext.measureText(currentAnnotation.content).width;
        currentAnnotation.style = {
          fontSize: 12,
          fontFamily: 'Consolas',
          color: this.currentThemeSettings.textKeyColor,
        };
        currentAnnotation.offset = { x: (keyTextWidth / 2 + nodePadding) / node.width!, y: yPosition };
      } else {
        currentAnnotation.style = {
          fontSize: 12,
          fontFamily: 'Consolas',
          color: this.currentThemeSettings.textValueColor,
        };
        const previousAnnotation = nodeAnnotations[annotationIndex - 1];
        const previousKeyWidth = previousAnnotation ? canvasContext.measureText(previousAnnotation.content).width : 0;
        const currentValueWidth = canvasContext.measureText(currentAnnotation.content).width;
        const keyXPosition = previousKeyWidth / 2 / node.width!;
        const valueXPosition =
          keyXPosition * 2 + currentValueWidth / 2 / node.width! + (nodePadding + 8) / node.width!;
        // if there is a previous annotation, position the value annotation next to it, or else position it at the center(default)
        if (previousAnnotation) {
          currentAnnotation.offset = { x: valueXPosition, y: yPosition };
          currentAnnotation.content = this.formatDisplayValue(currentAnnotation.content);
        }
        currentLineNumber++;
      }
      this.applyAnnotationStyle(currentAnnotation, currentAnnotation?.content);
    }
  }

  // Format the display value for annotations based on its type
  private formatDisplayValue(rawValue: string): string {
    if (this.isPureNumber(rawValue) || /^(true|false)$/i.test(rawValue)) {
      return rawValue.toLowerCase();
    }
    return rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue : `"${rawValue}"`;
  }

  // Apply annotation styles based on the annotation type
  private applyAnnotationStyle(annotation: ShapeAnnotation, rawValue: string) {
    if (annotation.id!.startsWith('Key')) {
      annotation.style!.color = this.currentThemeSettings.textKeyColor;
    } else if (annotation.id!.startsWith('Value')) {
      annotation.style!.color = this.determineValueStyle(rawValue);
    } else if (annotation.id!.startsWith('Count')) {
      annotation.style!.color = this.currentThemeSettings.textValueColor;
    }
  }

  // Determine the style for the annotation text based on its type
  private determineValueStyle(rawValue: string) {
    if (this.isPureNumber(rawValue)) {
      return this.currentThemeSettings.numericColor;
    } else if (
      rawValue.toLowerCase() === 'true' ||
      rawValue.toLowerCase() === 'false'
    ) {
      return rawValue.toLowerCase() === 'true'
        ? this.currentThemeSettings.booleanColor
        : 'red';
    }
    return this.currentThemeSettings.textValueColor;
  }

  // Utility function to check if a string is a pure number
  private isPureNumber(value: string): boolean {
      const numberRegex = /^\d+(\.\d+)?$/;
      return numberRegex.test(value);
  }

  // Creates expand and collapse icon for node
  private createIcon(shape: 'Plus' | 'Minus', w: number, h: number) {
    return {
      shape,
      width: w,
      height: h,
      cornerRadius: 3,
      margin: { right: w / 2 },
      fill: this.currentThemeSettings.expandIconFillColor,
      borderColor: this.currentThemeSettings.expandIconBorder,
      iconColor: this.currentThemeSettings.expandIconColor,
    };
  }

  // Update the icon offset based on the current orientation of the diagram
  private updateIconOffset(icon: any) {
    if (this.currentOrientation === 'TopToBottom') {
      icon.offset = { x: 1, y: 0.5 };
    } else if (this.currentOrientation === 'RightToLeft') {
      icon.offset = { x: 0.5, y: 0 };
    } else if (this.currentOrientation === 'LeftToRight') {
      icon.offset = { x: 0.5, y: 1 };
    } else {
      icon.offset = { x: 1, y: 0.5 };
    }
  }

  // Connector Defaults
  getConnectorDefaults(connector: ConnectorModel): ConnectorModel {
    connector.constraints =
      ConnectorConstraints.Default & ConnectorConstraints.Select;
    connector.type = 'Orthogonal';
    connector.style = {
      strokeColor: this.currentThemeSettings.connectorStrokeColor,
      strokeWidth: 2,
    };
    connector.cornerRadius = 15;
    connector.targetDecorator = { shape: 'None' };
    return connector;
  }

  handleExpandStateChange(args: IExpandStateChangeEventArgs) {
    const node: Node = args.element as Node;
    if (!node || typeof node !== 'object') {
        return;
    }
    // Check if it's a root node (no incoming edges)
    const isRootNode = !node.inEdges || node.inEdges.length === 0;
    if (isRootNode) {
        this.isGraphCollapsed = !node.isExpanded;
        let hamburger = new HamburgerComponent();
        hamburger.toggleCollapseItem(this.isGraphCollapsed);
    }
    this.diagram.doLayout();
};

  // refreshes the diagram layout and fits it to the page
  refreshLayout() {
    this.diagram.refresh();
    this.diagram.fitToPage({
      region: 'Content',
      canZoomIn: true,
    });
  }

  // trigger popup that displays popup on node click
  public onDiagramClick(args: any) {
    const clickedNode = args.element;
    const hasValidData = clickedNode?.data?.actualdata && 
                        clickedNode.data?.path && 
                        args.actualObject;
    if (hasValidData) {
      this.nodeClicked.emit({
        content: clickedNode.data.actualdata,
        path: clickedNode.data.path,
      });
    }
  }

  // Rotates the layout of the diagram between different orientations
  public rotateLayout(): void {
    this.orientationIndex =
      (this.orientationIndex + 1) % this.orientations.length;
    const selectedOrientation = this.orientations[this.orientationIndex];
    this.currentOrientation = selectedOrientation;
    this.layout.orientation = selectedOrientation;
    this.diagram.layout.orientation = selectedOrientation;
    this.diagram.nodes.forEach((diagramNode) => {
      if (diagramNode.expandIcon) this.updateIconOffset(diagramNode.expandIcon);
      if (diagramNode.collapseIcon) this.updateIconOffset(diagramNode.collapseIcon);
    });
    setTimeout(() => this.diagram.fitToPage());
  }

  // Toggles the collapse state of the diagram nodes
  public toggleCollapse(): void {
    const diagramNodes = this.diagram.nodes;
    let root = this.diagram.nodes.find((node)=>(node as Node).inEdges.length === 0);
    this.isGraphCollapsed = !root.isExpanded;
    // if the graph is collapsed, expand all nodes
    if (this.isGraphCollapsed) {
      diagramNodes.forEach((diagramNode) => (diagramNode.isExpanded = true));
      this.isGraphCollapsed = false;
    } 
    // if the graph is expanded, collapse all root nodes
    else {
      (diagramNodes as Node[]).forEach((currentNode) => {
        const isRootNode = !currentNode.inEdges || currentNode.inEdges.length === 0;
        if (isRootNode) {
          if (!currentNode.expandIcon || currentNode.expandIcon.shape === 'None') {
            (currentNode.outEdges || []).forEach((edgeId) => {
              const connector = this.diagram.connectors.find((connectorItem) => connectorItem.id === edgeId);
              const targetNode = connector && diagramNodes.find((nodeItem) => nodeItem.id === connector.targetID);
              if (targetNode) {
                targetNode.isExpanded = false;
              }
            });
          } else {
            currentNode.isExpanded = false;
          }
        }
      });
      this.isGraphCollapsed = true;
    }
  }

  // searches for nodes in the diagram based on a query string
  public searchNodes(searchQuery: string) {
    // reset
    this.searchMatchIds = [];
    this.searchMatchIndex = 0;
    this.diagram.reset();

    // collect all matching node IDs
    (this.diagram.nodes as DiagramNode[]).forEach((diagramNode) => {
      const nodeTextContent = String(diagramNode.data?.actualdata || '').toLowerCase();
      if (searchQuery && nodeTextContent.includes(searchQuery.toLowerCase())) {
        this.searchMatchIds.push(diagramNode.id!);
      }
      // reset style on every node
      const nodeElement = document.getElementById(diagramNode.id! + '_content');
      if (nodeElement) {
        nodeElement.setAttribute('stroke', this.currentThemeSettings.nodeStrokeColor);
        nodeElement.setAttribute('fill', this.currentThemeSettings.nodeFillColor);
      }
    });

    // highlight *all* matches
    this.searchMatchIds.forEach((matchedNodeId) => {
      const matchedElement = document.getElementById(matchedNodeId + '_content');
      if (matchedElement) {
        matchedElement.setAttribute(
          'stroke',
          this.currentThemeSettings.highlightStrokeColor
        );
        matchedElement.setAttribute('stroke-width', '2');
        matchedElement.setAttribute('fill', this.currentThemeSettings.highlightFillColor);
      }
    });

    // focus the very first one (if any)
    this.focusCurrent();

    // tell toolbar how many we found
    this.searchStats.emit({
      current: this.searchMatchIds.length ? 1 : 0,
      total: this.searchMatchIds.length,
    });
  }

  // bring the current match into center and give it "focus" style 
  private focusCurrent() {
    if (!this.searchMatchIds.length) {
      return;
    }
    const currentMatchId = this.searchMatchIds[this.searchMatchIndex];
    const currentMatchNode = this.diagram.getObject(currentMatchId) as any;
    if (!currentMatchNode) {
      return;
    }

    // re‐highlight only the focused one differently
    this.searchMatchIds.forEach((nodeId, nodeIndex) => {
      const nodeElement = document.getElementById(nodeId + '_content');
      if (nodeElement) {
        nodeElement.setAttribute('stroke-width', '2');
        if (nodeIndex === this.searchMatchIndex) {
          nodeElement.setAttribute(
            'fill',
            this.currentThemeSettings.highlightFocusColor
          );
          nodeElement.setAttribute(
            'stroke',
            this.currentThemeSettings.highlightStrokeColor
          );
        } else {
          nodeElement.setAttribute(
            'fill',
            this.currentThemeSettings.highlightFillColor
          );
          nodeElement.setAttribute(
            'stroke',
            this.currentThemeSettings.highlightStrokeColor
          );
        }
      }
    });

    // center it in the viewport
    if (currentMatchNode.wrapper && currentMatchNode.wrapper.bounds)
      this.diagram.bringToCenter(currentMatchNode.wrapper.bounds);
  }

  // called by parent when Enter is pressed
  public focusNext() {
    if (!this.searchMatchIds.length) {
      return;
    }
    this.searchMatchIndex = (this.searchMatchIndex + 1) % this.searchMatchIds.length;
    this.focusCurrent();
    this.searchStats.emit({
      current: this.searchMatchIndex + 1,
      total: this.searchMatchIds.length,
    });
  }

  // toggles the visibility of grid lines in the diagram
  public toggleGridLines(): void {
    const snapSettings = this.diagram?.snapSettings;
    if (!snapSettings || typeof snapSettings.constraints === 'undefined') return;
    const currentConstraints = snapSettings.constraints;
    if ((currentConstraints & SnapConstraints.ShowLines) === SnapConstraints.ShowLines) {
      snapSettings.constraints = currentConstraints & ~SnapConstraints.ShowLines;
    } else {
      snapSettings.constraints = currentConstraints | SnapConstraints.ShowLines;
    }
  }

  // toggles the visibility of child item count annotation in the diagram nodes
  public toggleChildCount(): void {
    this.showChildItemsCount = !this.showChildItemsCount;
    this.diagram.fitToPage({ mode: "Page", region: "Content", canZoomIn: true });
    this.diagram.refresh();
  }

  // toggles the visibility of expand/collapse icons in the diagram nodes
  public toggleExpandIcons(): void {
    this.showExpandCollapseIcon = !this.showExpandCollapseIcon;
    this.diagram.fitToPage({ mode: "Page", region: "Content", canZoomIn: true });
    this.diagram.refresh();
  }

  // update the diagram based on the selected theme
  setTheme(selectedTheme: 'light' | 'dark') {
    themeService.setTheme(selectedTheme);
    this.currentThemeSettings = themeService.getCurrentThemeSettings();

    this.diagram.backgroundColor = this.currentThemeSettings.backgroundColor;
    const diagramSnapSettings = this.diagram.snapSettings;
    if (
      diagramSnapSettings &&
      diagramSnapSettings.verticalGridlines &&
      diagramSnapSettings.horizontalGridlines
    ) {
      diagramSnapSettings.verticalGridlines.lineColor =
        this.currentThemeSettings.gridlinesColor;
      diagramSnapSettings.horizontalGridlines.lineColor =
        this.currentThemeSettings.gridlinesColor;
    }
    this.refreshLayout();
  }
}