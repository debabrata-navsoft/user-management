import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('total', 50);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('limit', 10);
    fixture.detectChanges();
  });

  it('should calculate total pages correctly', () => {
    expect(component.totalPages()).toBe(5);
  });

  it('should calculate start and end items', () => {
    expect(component.startItem()).toBe(1);
    expect(component.endItem()).toBe(10);
  });
});
