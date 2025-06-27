import {
  Component,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ViewChild,
  Input,
  AfterViewInit
} from '@angular/core';
import {
  ClickEventArgs,
  ItemModel
} from '@syncfusion/ej2-angular-navigations';
import {
  TextBoxComponent,
} from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-toolbar',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="diagram-toolbar">
      <ejs-toolbar
        [overflowMode]="'Extended'"
        [items]="diagramToolbarItems"
        (clicked)="onToolbarItemClicked($event)">
      </ejs-toolbar>
      <ejs-textbox
        #searchTextBox
        cssClass="toolbar-search"
        placeholder="Search Node"
        (input)="onSearchInputChange($event)"
        (keydown.enter)="onSearchNextMatch()"/>
    </div>
  `,
  styles: [`
    .diagram-toolbar { display: flex; align-items: center; }
    ejs-toolbar { 
      margin-right: 12px; border:0;
    }

    .toolbar-search {
      width: 11rem !important; 
      padding-left: 4px !important;
    }
    .toolbar-search .e-input{
      padding:0px !important;
    }
    .e-toolbar{
     border: 0;
    }
     
    body:not(.dark-theme) .e-toolbar .e-toolbar-item .e-tbar-btn{
      background: #343A401A !important;
      border-radius: 3px;
    }

    .diagram-toolbar.e-toolbar .e-toolbar-items {
      background: transparent !important;
      margin: 0;
      padding: 0;
    }
    .e-input-group-icon.counter-icon {
      font-size: .75rem !important;
      padding: 0 8px;
      color: #888;
    }
    .counter-icon.hidden {
      display: none;
    }
    .e-toolbar, .e-toolbar .e-toolbar-items{
      background: transparent !important;
    } 
  `]
})
export class ToolbarComponent implements AfterViewInit {
  @Output() toolClick = new EventEmitter<'reset'|'fitToPage'|'zoomIn'|'zoomOut'>();
  @Output() searchNode = new EventEmitter<string>();
  @Output() nextMatch = new EventEmitter<void>();
  
  @ViewChild('searchTextBox', { static: false }) searchTextBoxComponent!: TextBoxComponent;

  private shouldShowSearchCounter = false;
  public diagramToolbarItems: ItemModel[] = [
    { prefixIcon: 'e-icons e-reset',      tooltipText: 'Reset Zoom',      id: 'reset',     cssClass: 'e-flat' },
    { prefixIcon: 'e-icons e-zoom-to-fit', tooltipText: 'Fit To Page',id: 'fitToPage', cssClass: 'e-flat' },
    { prefixIcon: 'e-icons e-zoom-in',     tooltipText: 'Zoom In',    id: 'zoomIn',    cssClass: 'e-flat' },
    { prefixIcon: 'e-icons e-zoom-out',    tooltipText: 'Zoom Out',   id: 'zoomOut',   cssClass: 'e-flat' }
  ];

  private _currentSearchResultIndex = 0;
  // Set current search result index and update counter display
  @Input()
  set current(searchResultIndex: number) {
    this._currentSearchResultIndex = searchResultIndex;
    this.updateSearchResultCounter();
  }

  private _totalSearchResults = 0;
  // Set total search results count and update counter display
  @Input()
  set total(totalResults: number) {
    this._totalSearchResults = totalResults;
    this.updateSearchResultCounter();
  }

  // Initialize search textbox with icons after view initialization
  ngAfterViewInit() {
    this.searchTextBoxComponent.addIcon('prepend', 'e-icons e-search');
    this.searchTextBoxComponent.addIcon('append', 'counter-icon');
    this.updateSearchResultCounter();
  }

  // Update search result counter display based on current state
  private updateSearchResultCounter() {
    const searchCounterElement = document.querySelector('.counter-icon');
    if (searchCounterElement) {
      searchCounterElement.textContent = this.shouldShowSearchCounter
        ? `${this._currentSearchResultIndex} / ${this._totalSearchResults}`
        : '';
      searchCounterElement.classList.toggle('hidden', !this.shouldShowSearchCounter);
    }
  }

  // Handle toolbar button clicks and emit corresponding action
  onToolbarItemClicked(clickEvent: ClickEventArgs) {
    this.toolClick.emit(clickEvent.item.id as any);
  }

  // Handle search input changes and emit search value
  onSearchInputChange(inputEvent: any) {
    let searchValue = '';
    if ('value' in inputEvent && inputEvent.value != null) {
      searchValue = String(inputEvent.value);
    } else if (inputEvent.target && (inputEvent.target as HTMLInputElement).value != null) {
      searchValue = (inputEvent.target as HTMLInputElement).value;
    }
    if (searchValue.trim() !== "") {
      this.shouldShowSearchCounter = true;
    } else {
      this.shouldShowSearchCounter = false;
    }
    this.searchNode.emit(searchValue.trim());
  }

  // Handle Enter key press to navigate to next search match
  onSearchNextMatch() {
    this.nextMatch.emit();
  }

  // Clear search textbox and reset search counter state
  clearSearchText() {
    if (this.searchTextBoxComponent) {
      this.searchTextBoxComponent.value = '';
    }
    this.shouldShowSearchCounter = false;
    this.total = 0;
    this.current = 0;
  }
}