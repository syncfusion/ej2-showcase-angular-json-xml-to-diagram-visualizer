import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DiagramData, DiagramParserService } from '../../services/diagram-parser.service';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { NuMonacoEditorComponent } from '@ng-util/monaco-editor';
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { HamburgerComponent } from '../hamburger/hamburger.component';
import { DiagramComponent } from '../diagram/diagram.component';

@Component({
  selector: 'app-editor',
  template: `
    <nu-monaco-editor
      #monacoEditor
      *ngIf="isBrowserEnvironment"
      [(ngModel)]="editorContent"
      [options]="monacoEditorOptions"
      (ngModelChange)="onEditorContentChange()"
      style="width:100%; height:100%; display:block;">
    </nu-monaco-editor>
  `,
  styles: [':host { display:block; height:100%; }']
})
export class EditorComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('monacoEditor') public monacoEditorComponent!: NuMonacoEditorComponent;

  @Input() editorType: 'json' | 'xml' = 'json';
  @Output() diagramData = new EventEmitter<DiagramData>();
  @Output() validStatus = new EventEmitter<boolean>();

  private diagramParserService = inject(DiagramParserService);
  private platformId = inject(PLATFORM_ID);
  private editorService = inject(EditorService);
  private languageChangeSubscription!: Subscription;
  private xmlToJsonParser: any;
  private jsonToXmlBuilder: any;

  editorContent = '';
  isBrowserEnvironment = isPlatformBrowser(this.platformId);
  monacoEditorOptions = {
    language: 'json' as 'json' | 'xml',
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 }
  };

  constructor() {
    // Initialize XML parsers with fixed imports
    this.xmlToJsonParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: true,
      parseAttributeValue: true,
      allowBooleanAttributes: true,
      isArray: () => false,
    });

    this.jsonToXmlBuilder = new XMLBuilder({
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
  }

  // Initialize component, load sample data and subscribe to language changes
  ngOnInit(): void {
    if (!this.isBrowserEnvironment) return;

    fetch('./data/sample.json')
      .then((response) => response.json())
      .then((sampleJsonData) => (this.editorContent = JSON.stringify(sampleJsonData, null, 2)))
      .finally(() => this.onEditorContentChange());

    this.languageChangeSubscription = this.editorService.language$.subscribe(
      (newLanguageType) => {
        if (newLanguageType !== this.editorType) {
          this.switchEditorLanguage(newLanguageType);
        }
      }
    );
  }

  // Clean up subscriptions when component is destroyed
  ngOnDestroy(): void {
    if (this.languageChangeSubscription) {
      this.languageChangeSubscription.unsubscribe();
    }
  }

  // Handle input property changes and switch editor language if needed
  ngOnChanges(changes: SimpleChanges) {
    if (!this.isBrowserEnvironment) return;
    if (changes['editorType'] && !changes['editorType'].firstChange) {
      this.switchEditorLanguage(this.editorType);
    }
  }

  // Switch editor language between JSON and XML with content conversion
  private async switchEditorLanguage(targetLanguageType: 'json' | 'xml') {
    const currentEditorContent = this.editorContent.trim();
    this.validStatus.emit(false);
    this.editorType = targetLanguageType;
    this.monacoEditorOptions = { ...this.monacoEditorOptions, language: targetLanguageType };
    const monacoEditorInstance = this.monacoEditorComponent?.editor;
    const editorModel = monacoEditorInstance?.getModel();
    if (editorModel && (window as any).monaco) {
      (window as any).monaco.editor.setModelLanguage(editorModel, targetLanguageType);
    }
    try {
      if (targetLanguageType === 'xml') {
        // Only try to convert if content is valid JSON
        try {
          const parsedJsonObject = JSON.parse(currentEditorContent);
          const convertedXmlContent = this.jsonToXmlBuilder.build(parsedJsonObject);
          this.editorContent = convertedXmlContent;
        } catch {
          // If not valid JSON, just switch language without conversion
          // Optionally, show a warning to the user
        }
      } else {
        // Only try to convert if content looks like XML
        if (currentEditorContent.startsWith('<')) {
          const parsedXmlAsJson = this.xmlToJsonParser.parse(`<root>${currentEditorContent}</root>`);
          const parsedJsonObject = parsedXmlAsJson.root;
          this.editorContent = JSON.stringify(parsedJsonObject, null, 2);
        } else {
          // If not valid XML, just switch language without conversion
          // Optionally, show a warning to the user
        }
      }
    } catch (conversionError) {
      console.error('Editor type switch error:', conversionError);
      this.validStatus.emit(false);
    }
    let diagramComponent = new DiagramComponent();
    diagramComponent.isGraphCollapsed = false;
    let hamburger = new HamburgerComponent();
    hamburger.toggleCollapseItem(false);
  }
  
  // Handle editor content changes and parse data based on current editor type
  onEditorContentChange() {
    if (!this.editorContent?.trim()) {
      this.validStatus.emit(false);
      return;
    }

    try {
      if (this.editorType === 'json') {
        const parsedJsonData = JSON.parse(this.editorContent);
        this.convertJsonToDiagramData(parsedJsonData);
      } else if (this.editorType === 'xml') {
        if (!this.editorContent.trim().startsWith('<')) {
          throw new Error('Invalid XML format');
        }
        const convertedXmlToJson = this.xmlToJsonParser.parse(`<root>${this.editorContent}</root>`);
        this.convertJsonToDiagramData(convertedXmlToJson.root);
      }
    } catch (parsingError) {
      console.error("Parsing error:", parsingError);
      this.validStatus.emit(false);
    }
    let diagramComponent = new DiagramComponent();
    diagramComponent.isGraphCollapsed = false;
    let hamburger = new HamburgerComponent();
    hamburger.toggleCollapseItem(false);
  }

  // Convert JSON object to diagram data and emit validation status
  private convertJsonToDiagramData(jsonObject: any) {
    try {
      const diagramDataResult = this.diagramParserService.processJson(jsonObject);
      const hasValidDiagramData = diagramDataResult.nodes.length > 0 || diagramDataResult.connectors.length > 0;
      this.validStatus.emit(hasValidDiagramData);
      if (hasValidDiagramData) this.diagramData.emit(diagramDataResult);
    } catch {
      this.validStatus.emit(false);
    }
  }

  // Trigger Monaco editor layout recalculation
  layoutEditor(): void {
    this.monacoEditorComponent?.editor?.layout();
  }
}