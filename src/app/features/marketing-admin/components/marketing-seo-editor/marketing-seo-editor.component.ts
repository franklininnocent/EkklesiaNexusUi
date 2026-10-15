import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MARKETING_CANONICAL_ORIGINS,
  MARKETING_SEO_DESCRIPTION_MAX,
  MARKETING_SEO_PAGE_IDS,
  MARKETING_SEO_PAGE_META,
  MarketingSeoPageId,
} from '../../constants/marketing-seo.constants';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { TabStripComponent, TabStripItem } from '@shared/components/tab-strip/tab-strip.component';
import { duplicateSeoTitleWarnings, MarketingSeoForm } from '../../models/marketing-seo.models';

@Component({
  selector: 'app-marketing-seo-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, CfDatePipe, TabStripComponent],
  templateUrl: './marketing-seo-editor.component.html',
  styleUrl: './marketing-seo-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingSeoEditorComponent {
  readonly origins = MARKETING_CANONICAL_ORIGINS;
  readonly pageIds = MARKETING_SEO_PAGE_IDS;
  readonly pageMeta = MARKETING_SEO_PAGE_META;
  readonly seoDescriptionMax = MARKETING_SEO_DESCRIPTION_MAX;

  @Input({ required: true }) model!: MarketingSeoForm;
  /** ISO timestamp from published payload `seo.publishedAt` when live. */
  @Input() seoPublishedAt: string | null = null;
  @Output() modelChange = new EventEmitter<MarketingSeoForm>();

  activePageId: MarketingSeoPageId = 'home';
  panel: 'global' | 'pages' | 'discoverability' | 'integrations' = 'global';

  readonly seoPanelStrip: TabStripItem[] = [
    { id: 'global', label: 'Global' },
    { id: 'pages', label: 'Pages' },
    { id: 'discoverability', label: 'Discoverability' },
    { id: 'integrations', label: 'Integrations' },
  ];

  onSeoPanelChange(panelId: string): void {
    this.panel = panelId as 'global' | 'pages' | 'discoverability' | 'integrations';
  }

  emit(): void {
    this.modelChange.emit(this.model);
  }

  onPageFieldChange(): void {
    const locked = this.pageMeta[this.activePageId].indexLockedNo;
    if (locked) {
      this.model.pages[this.activePageId].robotsIndex = false;
      this.model.pages[this.activePageId].robotsFollow = false;
    }
    this.emit();
  }

  titleLengthHint(length: number): string {
    if (length === 0) return 'Required';
    if (length < 15) return 'Short — aim for 15–60 characters for search snippets';
    if (length > 60) return 'Long — aim for 15–60 characters';
    return 'Good length for search snippets';
  }

  descriptionLengthHint(length: number): string {
    if (length === 0) return 'Required';
    if (length < 50) return `Short — ${length} of ${this.seoDescriptionMax} characters`;
    if (length > 160) {
      return `${length} of ${this.seoDescriptionMax} characters (search snippets usually show about 160)`;
    }
    return `${length} of ${this.seoDescriptionMax} characters`;
  }

  socialPreviewTitle(pageId: MarketingSeoPageId): string {
    const page = this.model.pages[pageId];
    return (page.ogTitle?.trim() || page.seoTitle).trim();
  }

  socialPreviewDescription(pageId: MarketingSeoPageId): string {
    const page = this.model.pages[pageId];
    return (page.ogDescription?.trim() || page.seoDescription).trim();
  }

  sitemapPreview(): string[] {
    const urls: string[] = [];
    for (const id of this.pageIds) {
      const page = this.model.pages[id];
      if (!page.robotsIndex) continue;
      const origin = this.model.canonicalOrigin.replace(/\/$/, '');
      urls.push(page.path === '/' ? `${origin}/` : `${origin}${page.path}`);
    }
    return urls;
  }

  duplicateTitleWarnings(): string[] {
    return duplicateSeoTitleWarnings(this.model);
  }
}
