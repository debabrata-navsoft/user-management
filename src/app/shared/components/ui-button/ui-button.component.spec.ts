import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiButtonComponent } from './ui-button.component';

describe('UiButtonComponent', () => {
  let fixture: ComponentFixture<UiButtonComponent>;
  let component: UiButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply primary variant class by default', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('btn-primary')).toBe(true);
  });
});
