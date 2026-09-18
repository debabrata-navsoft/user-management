import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideAngularModule, Search, X } from 'lucide-angular';
import { SearchInputComponent } from './search-input.component';

describe('SearchInputComponent', () => {
  let fixture: ComponentFixture<SearchInputComponent>;
  let emitted: string[];

  const inputEl = (): HTMLInputElement => fixture.nativeElement.querySelector('.search-input');

  const type = (text: string) => {
    const el = inputEl();
    el.value = text;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchInputComponent],
      providers: [importProvidersFrom(LucideAngularModule.pick({ Search, X }))],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchInputComponent);
    fixture.componentRef.setInput('debounce', 0);
    emitted = [];
    fixture.componentInstance.searchChange.subscribe((q) => emitted.push(q));
    fixture.detectChanges();
  });

  it('reports what the user types', async () => {
    type('ac');
    await new Promise((r) => setTimeout(r, 10));

    expect(emitted).toEqual(['ac']);
  });

  it('follows the query its parent holds', () => {
    fixture.componentRef.setInput('value', 'ac');
    fixture.detectChanges();
    expect(inputEl().value).toBe('ac');

    // Drive keeps the query when you open another folder; the box has to keep showing it.
    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    expect(inputEl().value).toBe('');
  });

  it('does not echo a parent-set query back as a search', async () => {
    fixture.componentRef.setInput('value', 'ac');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(emitted).toEqual([]);
  });
});
