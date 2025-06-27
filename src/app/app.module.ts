import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Import Syncfusion modules
import { DiagramAllModule, SymbolPaletteAllModule, SnappingService, DataBindingService, HierarchicalTreeService, PrintAndExportService, LineDistributionService } from '@syncfusion/ej2-angular-diagrams';
import { ContextMenuModule, MenuModule, ToolbarModule } from '@syncfusion/ej2-angular-navigations';
import { ButtonModule, CheckBoxModule, RadioButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownButtonModule } from '@syncfusion/ej2-angular-splitbuttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { DialogModule } from '@syncfusion/ej2-angular-popups';
import { NumericTextBoxModule, ColorPickerModule, SliderModule, UploaderModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';

import { AppComponent } from './app.component';
import { EditorComponent } from './components/editor/editor.component';
import { DiagramComponent } from './components/diagram/diagram.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { NodePopupComponent } from './components/node-popup/node-popup.component';
import { HamburgerComponent } from './components/hamburger/hamburger.component';
import { ExportDialogComponent } from './components/export-dialog/export-dialog.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { SpinnerComponent } from './components/spinner/spinner.component';

@NgModule({
  declarations: [
    AppComponent,
    EditorComponent,
    DiagramComponent,
    NavbarComponent,
    NodePopupComponent,
    HamburgerComponent,
    ExportDialogComponent,
    ToolbarComponent,
    SpinnerComponent
  ],
  imports: [
    NuMonacoEditorModule.forRoot({
      baseUrl: 'assets/monaco',
      defaultOptions: { automaticLayout: true }
    }),
    BrowserModule,
    FormsModule,
    CommonModule,
    DiagramAllModule,
    SymbolPaletteAllModule,
    ToolbarModule,
    ButtonModule,
    DropDownButtonModule,
    ContextMenuModule,
    CheckBoxModule,
    DropDownListModule,
    DialogModule,
    NumericTextBoxModule,
    ColorPickerModule,
    SliderModule,
    RadioButtonModule,
    UploaderModule,
    MenuModule,
    TextBoxModule
  ],
  providers: [SnappingService, DataBindingService,
    HierarchicalTreeService,
    PrintAndExportService,
    LineDistributionService],
  bootstrap: [AppComponent]
})
export class AppModule { }