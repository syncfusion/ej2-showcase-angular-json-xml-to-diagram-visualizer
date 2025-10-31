import {
  Component,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
import {
  DropDownButtonComponent,
  MenuEventArgs,
  ItemModel
} from '@syncfusion/ej2-angular-splitbuttons';
import { DiagramComponent } from '../diagram/diagram.component';

@Component({
  selector: 'app-hamburger',
  template: `
    <button ejs-dropdownbutton
      #hamburgerBtn
      id="hamburgerBtn"
      iconCss="e-icons e-menu"
      cssClass="e-caret-hide"
      [items]="menuItems"
      (select)="onSelect($event)">
    </button>
  `,
  styles: [`
    button[ejs-dropdownbutton]{
     background: #343A401A;
    }
    button[ejs-dropdownbutton] .e-icons.e-menu {
      font-size: 16px;
    }
    :host-context(.dark-theme) button[ejs-dropdownbutton]{
      background-color: #3A3A3A;
    }
  `]
})
export class HamburgerComponent {
  @Output() exportImage   = new EventEmitter<void>();
  @Output() rotateLayout  = new EventEmitter<void>();
  @Output() collapseGraph = new EventEmitter<void>();

  @ViewChild('hamburgerBtn', { static: true })
  private ddBtn!: DropDownButtonComponent;
  private isCollapsed = false;
  public menuItems: ItemModel[] = [
    { text: 'Export as Image', id: 'exportImage', iconCss: 'e-icons e-export' },
    { text: 'Rotate Layout',   id: 'rotateLayout',  iconCss: 'e-icons e-refresh' },
    { text: 'Collapse Graph',  id: 'collapseGraph', iconCss: 'e-icons e-collapse-2' }
  ];

  // emits the event based on the menu item selected
  onSelect(args: MenuEventArgs) {
    switch (args.item.id) {
      case 'exportImage':
        this.exportImage.emit();
        break;
      case 'rotateLayout':
        this.rotateLayout.emit();
        break;
      case 'collapseGraph':
        this.collapseGraph.emit();
        this.toggleCollapseItem(this.isCollapsed);
        break;
    }
  }

  // toggles the collapse graph menu item text between collapsed and expanded states
  public toggleCollapseItem(isGraphCollapsed: boolean) {
    const item = this.menuItems.find(i => i.id === 'collapseGraph')!;
    item.text    = isGraphCollapsed ? 'Expand Graph'  : 'Collapse Graph';
    item.iconCss = isGraphCollapsed ? 'e-icons e-expand' : 'e-icons e-collapse-2';

    // Apply back to the Angular wrapper and rebind
    if (this.ddBtn) {
      this.ddBtn.items = this.menuItems;
    } else {
      let hamburger = (document.getElementById('hamburgerBtn') as any).ej2_instances[0];
      hamburger.items = this.menuItems;
    }
  }
}