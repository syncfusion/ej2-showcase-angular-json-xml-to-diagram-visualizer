import {
  Component,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { DialogComponent } from '@syncfusion/ej2-angular-popups';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface JsonPropertyLine {
  propertyKey: string;
  propertyValue: string;
  shouldAddComma: boolean;
}

@Component({
  selector: 'app-node-popup',
  standalone: false,
  template: `
    <ejs-dialog
      #nodeDetailsDialog
      header="Node Details"
      width="400px"
      [visible]="isDialogVisible"
      [showCloseIcon]="true"
      [isModal]="true"
      [closeOnEscape]="true"
      (overlayClick)="hideDialog()"
    >
      <div class="popup-content">
        <div class="section">
          <label>Content</label>
          <div class="dialog-box">
            <div [innerHTML]="sanitizedContentHtml"></div>
              <button class="copy-btn" (click)="copyNodeContent()">
                <span
                  class="e-icons"
                  [ngClass]="{'e-copy': !isContentCopied, 'e-check': isContentCopied}"
                ></span>
              </button>
          </div>
        </div>
        <div class="section">
          <label>JSON Path</label>
          <div class="dialog-box">
            <div [innerHTML]="sanitizedPathHtml"></div>
              <button class="copy-btn" (click)="copyJsonPath()">
                <span
                  class="e-icons"
                  [ngClass]="{'e-copy': !isPathCopied, 'e-check': isPathCopied}"
                ></span>
              </button>
          </div>
        </div>
      </div>
    </ejs-dialog>
  `,
  styles: [`

    :root {
      --popup-content-bg: #f0f0f0;
      --popup-key-color: #5C940D;
      --popup-value-color: #1864AB;
    }

    body.dark-theme {
      --popup-content-bg: #01000c57;
      --popup-key-color: #A5D8FF;
      --popup-value-color: #40C057;
    }
    .e-popup.e-popup-open.e-dialog {
        max-height: 98% !important;
    }
    .popup-content {
      font-size: 14px;
    }
    .section {
      margin-bottom: 15px;
    }
    .keyText{
     color: var(--popup-key-color);
    }
    .valueText{
      color: var(--popup-value-color);
    }
    .section label {
      font-weight: 500;
      display: block;
      margin-bottom: 5px;
    }
    .dialog-box {
      font-family: Consolas, monospace;
      position: relative;
      background: var(--popup-content-bg);
      border-radius: 5px;
      padding: 10px;
      overflow-x: auto;
    }
    .dialog-box pre {
      margin: 0;
      line-height: 16px;
    }
    .copy-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #6C757D;
    }

    div::-webkit-scrollbar {
      display: none;
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class NodePopupComponent {
  @ViewChild('nodeDetailsDialog', { static: true }) dialogComponent!: DialogComponent;

  isDialogVisible = false;
  rawNodeContent = '';
  rawJsonPath = '';
  isContentCopied = false;
  isPathCopied = false;
  sanitizedContentHtml!: SafeHtml;
  sanitizedPathHtml!: SafeHtml;

  constructor(private htmlSanitizer: DomSanitizer) {}

  // Open dialog with node content and path, generate sanitized HTML for display
  openDialog({ content, path }: { content: string; path: string }) {
    this.rawNodeContent = content;
    this.rawJsonPath = path;

    this.sanitizedContentHtml = this.htmlSanitizer.bypassSecurityTrustHtml(
      this.generateContentHtml(this.rawNodeContent)
    );
    this.sanitizedPathHtml = this.htmlSanitizer.bypassSecurityTrustHtml(
      this.generatePathHtml(this.rawJsonPath)
    );

    this.isDialogVisible = true;
    this.dialogComponent.show();
  }

  // Hide the dialog and reset visibility state
  hideDialog() {
    this.isDialogVisible = false;
    this.dialogComponent.hide();
  }

  // Copy formatted node content to clipboard and show success feedback
  copyNodeContent(): void {
    const formattedJsonString = this.buildFormattedJsonString(this.rawNodeContent);
    navigator.clipboard.writeText(formattedJsonString).then(() => {
      this.isContentCopied = true;
      setTimeout(() => (this.isContentCopied = false), 2000);
    });
  }

  // Copy JSON path to clipboard with root wrapper and show success feedback
  copyJsonPath(): void {
    const pathWithWrappedRoot = this.rawJsonPath.startsWith('Root')
      ? `{Root}${this.rawJsonPath.slice(4)}`
      : this.rawJsonPath;
    navigator.clipboard.writeText(pathWithWrappedRoot).then(() => {
      this.isPathCopied = true;
      setTimeout(() => (this.isPathCopied = false), 2000);
    });
  }

  // Build formatted JSON string from raw content for clipboard copying
  private buildFormattedJsonString(rawContent: string): string {
    const jsonPropertyLines = this.parseContentIntoJsonLines(rawContent);
    if (!jsonPropertyLines.length) {
      return `"${rawContent.trim()}"`;
    }
    let formattedOutput = '{\n';
    jsonPropertyLines.forEach(({ propertyKey, propertyValue, shouldAddComma }) => {
      formattedOutput += `  ${propertyKey}: ${propertyValue}${shouldAddComma ? ',' : ''}\n`;
    });
    return formattedOutput + '}';
  }

  // Generate styled HTML content for node content display
  private generateContentHtml(rawContent: string): string {
    const jsonPropertyLines = this.parseContentIntoJsonLines(rawContent);
    let htmlOutput = `<div style="padding:5px; overflow-x:auto; font-family:Consolas; font-size:14px;">`;

    if (jsonPropertyLines.length === 0) {
      htmlOutput += `<div class="valueText">"${rawContent.trim()}"</div>`;
    } else {
      htmlOutput += `<span>{</span>`;
      jsonPropertyLines.forEach(({ propertyKey, propertyValue, shouldAddComma }) => {
        htmlOutput += `
          <div>
            <span class="keyText"
              style="font-weight:550; margin-left:14px;">
              ${propertyKey}
            </span>
            <span style="margin:0 3px;">:</span>
            <span class="valueText">${propertyValue}</span>
            ${shouldAddComma ? ',' : ''}
          </div>`;
      });
      htmlOutput += `<span>}</span>`;
    }

    htmlOutput += `</div>`;
    return htmlOutput;
  }

  // Generate styled HTML for JSON path display
  private generatePathHtml(rawJsonPath: string): string {
    const pathWithBracesAroundRoot = this.wrapRootWithCurlyBraces(rawJsonPath.trim());
    return `<div style="padding:5px; overflow-x:auto; font-family:Consolas; font-size:14px;">
      ${pathWithBracesAroundRoot}
    </div>`;
  }

  // Parse node content into structured JSON property lines with proper formatting
  private parseContentIntoJsonLines(nodeContent: string): JsonPropertyLine[] {
    const parsedJsonLines: JsonPropertyLine[] = [];
    if (!nodeContent?.trim()) {
      return parsedJsonLines;
    }
    const contentLines = nodeContent.split('\n');
    contentLines.forEach((currentLine, lineIndex) => {
      const colonPosition = currentLine.indexOf(':');
      if (colonPosition < 0) {
        return;
      }
      const extractedKey = currentLine.slice(0, colonPosition).trim();
      let extractedValue = currentLine.slice(colonPosition + 1).trim();

      if (/^(true|false)$/i.test(extractedValue)) {
        extractedValue = extractedValue.toLowerCase();
      } else if (!isNaN(parseFloat(extractedValue))) {
      } else {
        const strippedQuotes = extractedValue.replace(/^"(.*)"$/, '$1');
        extractedValue = `"${strippedQuotes}"`;
      }

      parsedJsonLines.push({
        propertyKey: `"${extractedKey}"`,
        propertyValue: extractedValue,
        shouldAddComma: lineIndex < contentLines.length - 1
      });
    });
    return parsedJsonLines;
  }

  // Wrap 'Root' text with curly braces for proper JSON path formatting
  private wrapRootWithCurlyBraces(jsonPath: string): string {
    return jsonPath.startsWith('Root')
      ? `{Root}${jsonPath.slice(4)}`
      : jsonPath;
  }
}