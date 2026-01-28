import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { EditorComponent } from './components/editor/editor.component';
import { DiagramComponent } from './components/diagram/diagram.component';
import { DiagramData } from './services/diagram-parser.service';
import { NodePopupComponent } from './components/node-popup/node-popup.component';
import { HamburgerComponent } from './components/hamburger/hamburger.component';
import { ExportDialogComponent } from './components/export-dialog/export-dialog.component';
import { FileFormats } from '@syncfusion/ej2-angular-diagrams';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import themeService, { ThemeName } from './services/theme.service';
import { SpinnerComponent } from './components/spinner/spinner.component';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('leftPanel', { static: true }) leftPanelElement!: ElementRef<HTMLDivElement>;
  @ViewChild(DiagramComponent) diagramComponent!: DiagramComponent;
  @ViewChild(EditorComponent, { static: true }) editorComponent!: EditorComponent;
  @ViewChild(NodePopupComponent) nodePopupComponent!: NodePopupComponent;
  @ViewChild('exportDialog', { static: true }) exportDialogComponent!: ExportDialogComponent;
  @ViewChild(SpinnerComponent) spinnerComponent!: SpinnerComponent;
  @ViewChild(ToolbarComponent) toolbarComponent!: ToolbarComponent;

  currentEditorType: 'json' | 'xml' = 'json';
  isDataValid = true;
  parsedDiagramData: DiagramData = { nodes: [], connectors: [] };
  searchStatistics = { current: 0, total: 0 };

  private isResizingPanel = false;
  private resizeStartX = 0;
  private initialPanelWidth = 0;
  
  // Handle new diagram data from editor and refresh diagram layout
  onDiagramDataReceived(diagramData: DiagramData) {
    this.spinnerComponent.visible = true;
    this.toolbarComponent.clearSearchText();
    this.parsedDiagramData = diagramData;
    setTimeout(() => this.diagramComponent.refreshLayout());
    this.spinnerComponent.visible = false;
  }

  // Handle file import/export actions from navbar
  onFileActionTriggered(fileAction: string) {
    if (fileAction === 'import') {
      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      // Accept files based on current editor type
      fileInputElement.accept = this.currentEditorType === 'json' ? '.json' : '.xml';
      fileInputElement.onchange = fileChangeEvent => {
        const selectedFile = (fileChangeEvent.target as HTMLInputElement).files![0];
        if (!selectedFile) return;
        const fileReader = new FileReader();
        fileReader.onload = () => {
          const fileContent = fileReader.result as string;
          this.editorComponent.monacoEditorComponent.editor?.setValue(fileContent);
          this.editorComponent.onEditorContentChange();
        };
        fileReader.readAsText(selectedFile);
      };
      fileInputElement.click();
    } else {
      const editorContent = this.editorComponent.monacoEditorComponent.editor?.getValue() || " ";
      const fileExtension = this.currentEditorType;
      const contentBlob = new Blob([editorContent], { type: 'text/plain' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(contentBlob);
      downloadLink.download = `Diagram.${fileExtension}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }

  // Handle view option toggles from navbar (grid, count, expand/collapse)
  onViewOptionToggled(viewOption: string) {
    switch (viewOption) {
      case 'view-grid':
        this.diagramComponent.toggleGridLines();
        break;
      case 'view-count':
        this.diagramComponent.toggleChildCount();
        break;
      case 'expand-collapse':
        this.diagramComponent.toggleExpandIcons();
        break;
    }
    this.diagramComponent.refreshLayout();
  }

  // Handle theme changes and update all components accordingly
  onThemeChanged(selectedTheme: string) {
    this.spinnerComponent.visible = true;
    const isDarkTheme = selectedTheme === 'dark';
  
    themeService.setTheme(selectedTheme as ThemeName);
  
    this.diagramComponent.setTheme(selectedTheme as ThemeName);
  
    this.editorComponent.monacoEditorComponent.editor?.updateOptions({
      theme: isDarkTheme ? 'vs-dark' : 'vs'
    });
  
    const themeLinkElement = document.getElementById('theme-link') as HTMLLinkElement | null;
    if (themeLinkElement && themeLinkElement.href.includes('tailwind')) {
      themeLinkElement.href = themeLinkElement.href.replace(/tailwind(-dark)?\.css/, isDarkTheme ? 'tailwind-dark.css' : 'tailwind.css');
    }
    this.spinnerComponent.visible = false;
    this.toolbarComponent.clearSearchText();
  }
  
  // Handle editor type changes between JSON and XML
  onEditorTypeChanged(newEditorType: 'json' | 'xml') {
    this.currentEditorType = newEditorType;
  }
  
  // Handle diagram node clicks and open node details popup
  onDiagramNodeClicked(nodeData: { content: string; path: string }) {
    this.nodePopupComponent.openDialog(nodeData);
  }

  // Handle diagram export requests with specified format and filename
  onDiagramExportRequested(exportEvent: { fileName: string; format: string }) {
    this.diagramComponent.diagram.exportDiagram({
      format: exportEvent.format as FileFormats,
      fileName: exportEvent.fileName
    });
  }

  // Handle toolbar actions for diagram zoom and reset operations
  handleToolbarAction(toolbarAction: 'reset'|'fitToPage'|'zoomIn'|'zoomOut') {
    switch(toolbarAction) {
      case 'reset':
        this.diagramComponent.diagram.reset(); break;
      case 'fitToPage':
        this.diagramComponent.diagram.reset();
        this.diagramComponent.diagram.fitToPage({ region: 'Content', canZoomIn: true }); break;
      case 'zoomIn':
        this.diagramComponent.diagram.zoomTo({ type:'ZoomIn', zoomFactor:0.2 }); break;
      case 'zoomOut':
        this.diagramComponent.diagram.zoomTo({ type:'ZoomOut', zoomFactor:0.2 }); break;
    }
  }
  
  // Start panel resizing operation when user clicks on resize handle
  onPanelResizeStart(mouseDownEvent: MouseEvent) {
    this.isResizingPanel = true;
    this.resizeStartX = mouseDownEvent.clientX;
    this.initialPanelWidth = this.leftPanelElement.nativeElement.getBoundingClientRect().width;
    mouseDownEvent.preventDefault();
  }

  // Handle panel resizing during mouse movement with width constraints
  @HostListener('document:mousemove', ['$event'])
  onPanelResizing(mouseMoveEvent: MouseEvent) {
    if (!this.isResizingPanel) return;
    const mouseDeltaX = mouseMoveEvent.clientX - this.resizeStartX;
    const newPanelWidth = this.initialPanelWidth + mouseDeltaX;
    const minPanelWidth = 150;
    const maxPanelWidth = window.innerWidth * 0.5;
    this.leftPanelElement.nativeElement.style.width =
      Math.min(Math.max(newPanelWidth, minPanelWidth), maxPanelWidth) + 'px';
    this.editorComponent.layoutEditor();
  }

  // End panel resizing operation when mouse is released
  @HostListener('document:mouseup')
  onPanelResizeEnd() {
    this.isResizingPanel = false;
  }
}