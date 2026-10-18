import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { TabStripComponent, TabStripItem } from '@shared/components/tab-strip/tab-strip.component';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import {
  StatusBadgeComponent,
  StatusBadgeTone,
} from '@shared/components/status-badge/status-badge.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { ToastService } from '@core/services/toast.service';
import { MarketingAdminService } from '../../services/marketing-admin.service';
import {
  MarketingContentRevisionRow,
  PublishedMarketingContent,
} from '../../models/marketing-admin.models';
import {
  MarketingHeroEditorComponent,
  MarketingHeroForm,
} from '../../components/marketing-hero-editor/marketing-hero-editor.component';
import { MARKETING_COPY_CONTRACT } from '../../constants/marketing-copy-contract';
import { MarketingSeoEditorComponent } from '../../components/marketing-seo-editor/marketing-seo-editor.component';
import {
  applySeoFormToPayload,
  defaultMarketingSeoForm,
  duplicateSeoTitleWarnings,
  MarketingSeoForm,
  seoFormFromPayload,
} from '../../models/marketing-seo.models';
import { MarketingNavigationEditorComponent } from '../../components/marketing-navigation-editor/marketing-navigation-editor.component';
import { MarketingFooterEditorComponent } from '../../components/marketing-footer-editor/marketing-footer-editor.component';
import {
  applyStructureToPayload,
  finalCtaFromPayload,
  FinalCtaForm,
  footerFromPayload,
  FooterForm,
  navigationFromPayload,
  NavItemForm,
} from '../../models/marketing-structure.models';
import { MarketingFinalCtaEditorComponent } from '../../components/marketing-final-cta-editor/marketing-final-cta-editor.component';

@Component({
  selector: 'app-marketing-content-publish-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    CfEmptyStateComponent,
    LoadingSkeletonComponent,
    CfDatePipe,
    MarketingHeroEditorComponent,
    MarketingSeoEditorComponent,
    MarketingNavigationEditorComponent,
    MarketingFooterEditorComponent,
    MarketingFinalCtaEditorComponent,
    TabStripComponent,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './marketing-content-publish.page.html',
  styleUrl: './marketing-content-publish.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingContentPublishPage implements OnInit {
  private readonly api = inject(MarketingAdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmationDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  publishing = false;
  savingDraft = false;
  published: PublishedMarketingContent | null = null;
  revisions: MarketingContentRevisionRow[] = [];
  loadError = '';

  notes = '';
  jsonText = '';
  jsonError = '';
  /** Draft, published, bootstrap, or last parsed payload used when the JSON textarea is empty. */
  private payloadCache: Record<string, unknown> | null = null;
  editorTab: 'seo' | 'hero' | 'navigation' | 'footer' | 'finalCta' | 'json' = 'seo';

  readonly editorTabStrip: TabStripItem[] = [
    { id: 'seo', label: 'SEO', domId: 'tab-seo', ariaControls: 'panel-editor' },
    { id: 'hero', label: 'Hero', domId: 'tab-hero', ariaControls: 'panel-editor' },
    { id: 'navigation', label: 'Navigation', domId: 'tab-navigation', ariaControls: 'panel-editor' },
    { id: 'footer', label: 'Footer', domId: 'tab-footer', ariaControls: 'panel-editor' },
    { id: 'finalCta', label: 'Final CTA', domId: 'tab-final-cta', ariaControls: 'panel-editor' },
    { id: 'json', label: 'Full JSON', domId: 'tab-json', ariaControls: 'panel-editor' },
  ];
  heroForm: MarketingHeroForm = { description: '', image: '', imageAlt: '' };
  seoForm: MarketingSeoForm = defaultMarketingSeoForm();
  navigationItems: NavItemForm[] = [];
  footerForm: FooterForm = { statement: '', links: [] };
  finalCtaForm: FinalCtaForm = {
    title: '',
    description: '',
    ctaLabel: 'Request a Demo',
    ctaHref: '#contact',
  };

  /** Live `seo.publishedAt` from the published revision (discoverability UI). */
  get seoPublishedAt(): string | null {
    const payload = this.published?.payload;
    if (payload && typeof payload['seo'] === 'object' && payload['seo'] !== null) {
      const at = (payload['seo'] as Record<string, unknown>)['publishedAt'];
      if (typeof at === 'string' && at.trim() !== '') {
        return at;
      }
    }
    return this.published?.published_at ?? null;
  }

  get draftRevisionCount(): number {
    return this.revisions.filter((row) => row.status === 'draft').length;
  }

  get liveStatusLabel(): string {
    return this.published ? 'Live on public API' : 'Not published';
  }

  get liveStatusTone(): StatusBadgeTone {
    return this.published ? 'success' : 'warning';
  }

  get editorTabDescription(): string {
    switch (this.editorTab) {
      case 'seo':
        return 'Search, social, sitemap, and analytics settings for the marketing site.';
      case 'hero':
        return 'Homepage hero image and description. Headline copy is locked to the product contract.';
      case 'navigation':
        return 'Header links for the public site. Use allowed paths and hash anchors only.';
      case 'footer':
        return 'Footer statement and legal links shown on every marketing page.';
      case 'finalCta':
        return 'Bottom call-to-action band on the homepage.';
      case 'json':
        return 'Advanced: edit or import the full CMS payload.';
      default:
        return '';
    }
  }

  get applyCurrentTabLabel(): string {
    switch (this.editorTab) {
      case 'seo':
        return 'Apply SEO to JSON';
      case 'hero':
        return 'Apply hero to JSON';
      case 'navigation':
      case 'footer':
      case 'finalCta':
        return 'Apply structure to JSON';
      default:
        return 'Apply to JSON';
    }
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.loadError = '';
    this.api.listRevisions().subscribe({
      next: (rows) => {
        this.revisions = rows;
        this.api.getPublished().subscribe({
          next: (data) => {
            this.published = data;
            this.loadLatestDraftIntoEditor();
          },
          error: (err: HttpErrorResponse) => {
            if (err.status === 404) {
              this.published = null;
              this.loadLatestDraftIntoEditor();
              return;
            }
            this.loadError = err.error?.message ?? 'Could not load published content.';
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.loadError = 'Could not load revision history.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadLatestDraftIntoEditor(): void {
    this.api.getLatestDraft().subscribe({
      next: (draft) => {
        if (draft?.payload && typeof draft.payload === 'object' && !Array.isArray(draft.payload)) {
          if (draft.notes) {
            this.notes = draft.notes;
          }
          this.seedEditorPayload(draft.payload as Record<string, unknown>);
        } else if (this.published?.payload && typeof this.published.payload === 'object') {
          this.seedEditorPayload(this.published.payload as Record<string, unknown>);
        } else {
          this.fetchBootstrapIfNeeded();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (this.published?.payload && typeof this.published.payload === 'object') {
          this.seedEditorPayload(this.published.payload as Record<string, unknown>);
        } else {
          this.fetchBootstrapIfNeeded();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Fills the JSON editor once from server payload (does not overwrite in-progress edits). */
  private seedEditorPayload(payload: Record<string, unknown>): void {
    this.rememberPayload(payload);
    if (this.jsonText.trim()) {
      return;
    }
    this.jsonText = JSON.stringify(payload, null, 2);
    this.jsonError = '';
    this.syncFormsFromPayload(payload);
  }

  private rememberPayload(payload: Record<string, unknown>): void {
    this.payloadCache = payload;
  }

  private clonePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  }

  private fetchBootstrapIfNeeded(): void {
    if (this.jsonText.trim() || this.payloadCache) {
      return;
    }
    this.api.getBootstrapPayload().subscribe({
      next: (bootstrap) => {
        this.seedEditorPayload(bootstrap);
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.jsonText.trim()) {
          this.jsonError =
            'No draft or live content yet. Use Load starter template or import JSON on the Full JSON tab.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  importStarterTemplate(): void {
    this.api.getBootstrapPayload().subscribe({
      next: (bootstrap) => {
        this.jsonText = JSON.stringify(bootstrap, null, 2);
        this.jsonError = '';
        this.rememberPayload(bootstrap);
        this.syncFormsFromPayload(bootstrap);
        this.toast.success('Starter marketing template loaded into the editor.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Could not load the starter template. Import marketing-content.export.json manually.');
      },
    });
  }

  loadLiveContentIntoEditor(): void {
    if (!this.published?.payload || typeof this.published.payload !== 'object') {
      this.toast.error('Nothing is published yet. Use Load starter template or import JSON from EkklesiaNexusWeb.');
      return;
    }
    this.jsonText = JSON.stringify(this.published.payload, null, 2);
    this.jsonError = '';
    this.rememberPayload(this.published.payload as Record<string, unknown>);
    this.syncFormsFromPayload(this.published.payload as Record<string, unknown>);
    this.toast.success('Loaded the live published payload into the editor.');
    this.cdr.markForCheck();
  }

  /**
   * Resolves a payload from the JSON textarea, in-memory cache, or live publication.
   * Does not fetch the bootstrap file (use withPayloadForEdit for save/publish).
   */
  private resolvePayloadForEdit(): Record<string, unknown> | null {
    const fromJson = this.parseJsonText(false);
    if (fromJson) {
      this.rememberPayload(fromJson);
      return fromJson;
    }
    if (this.payloadCache) {
      return this.payloadCache;
    }
    if (this.published?.payload && typeof this.published.payload === 'object') {
      return this.published.payload as Record<string, unknown>;
    }
    return null;
  }

  private withPayloadForEdit(
    showFeedback: boolean,
    run: (payload: Record<string, unknown>) => void,
  ): void {
    const immediate = this.resolvePayloadForEdit();
    if (immediate) {
      run(immediate);
      return;
    }
    this.api.getBootstrapPayload().subscribe({
      next: (bootstrap) => {
        this.seedEditorPayload(bootstrap);
        run(bootstrap);
        this.cdr.markForCheck();
      },
      error: () => {
        this.jsonError =
          'No marketing content to save. Use Load starter template or import JSON on the Full JSON tab.';
        if (showFeedback) {
          this.toast.error(this.jsonError);
        }
        this.cdr.markForCheck();
      },
    });
  }

  saveDraft(): void {
    this.withPayloadForEdit(true, (payload) => {
      const merged = this.mergeEditorIntoPayload(this.clonePayload(payload));
      this.savingDraft = true;
      this.cdr.markForCheck();
      this.api.saveDraft(merged, this.notes).subscribe({
        next: () => {
          this.toast.success('Draft saved (not public yet).');
          this.savingDraft = false;
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.toast.error(err.error?.message ?? 'Draft save failed.');
          this.savingDraft = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  publishDraft(row: MarketingContentRevisionRow): void {
    if (row.status !== 'draft') return;
    this.confirm
      .confirm({
        title: 'Publish this draft?',
        message: `Revision #${row.id} will go live on the public marketing API.`,
        confirmText: 'Publish',
        cancelText: 'Cancel',
        variant: 'primary',
      })
      .subscribe((result) => {
        if (!result.confirmed) return;
        this.publishing = true;
        this.api.publishDraftRevision(row.id).subscribe({
          next: () => {
            this.toast.success('Draft published.');
            this.publishing = false;
            this.reload();
          },
          error: (err: HttpErrorResponse) => {
            this.toast.error(err.error?.message ?? 'Publish failed.');
            this.publishing = false;
            this.cdr.markForCheck();
          },
        });
      });
  }

  onEditorTabChange(tabId: string): void {
    this.setEditorTab(tabId as 'seo' | 'hero' | 'navigation' | 'footer' | 'finalCta' | 'json');
  }

  applyCurrentTabToJson(): void {
    switch (this.editorTab) {
      case 'seo':
        this.applySeoToJson();
        break;
      case 'hero':
        this.applyHeroToJson();
        break;
      case 'navigation':
      case 'footer':
      case 'finalCta':
        this.applyStructureToJson();
        break;
      default:
        break;
    }
  }

  setEditorTab(tab: 'seo' | 'hero' | 'navigation' | 'footer' | 'finalCta' | 'json'): void {
    if (tab === 'hero') {
      this.syncHeroFromJson(false);
    }
    if (tab === 'seo') {
      this.syncSeoFromJson(false);
    }
    if (tab === 'navigation' || tab === 'footer' || tab === 'finalCta') {
      this.syncStructureFromJson(false);
    }
    this.editorTab = tab;
    this.cdr.markForCheck();
  }

  onNavigationChange(items: NavItemForm[]): void {
    this.navigationItems = items;
  }

  onFooterChange(form: FooterForm): void {
    this.footerForm = form;
  }

  onFinalCtaChange(form: FinalCtaForm): void {
    this.finalCtaForm = form;
  }

  applyStructureToJson(): void {
    this.withPayloadForEdit(true, (payload) => {
      const merged = applyStructureToPayload(
        this.clonePayload(payload),
        this.navigationItems,
        this.footerForm,
        this.finalCtaForm,
      );
      this.jsonText = JSON.stringify(merged, null, 2);
      this.rememberPayload(merged);
      this.jsonError = '';
      this.toast.success('Site structure applied to JSON.');
      this.cdr.markForCheck();
    });
  }

  syncStructureFromJson(showToast = true): boolean {
    const payload = this.resolvePayloadForEdit();
    if (!payload) {
      if (showToast) {
        this.toast.error('Load valid JSON before editing navigation or footer.');
      }
      this.cdr.markForCheck();
      return false;
    }
    this.navigationItems = navigationFromPayload(payload);
    this.footerForm = footerFromPayload(payload);
    this.finalCtaForm = finalCtaFromPayload(payload);
    this.cdr.markForCheck();
    return true;
  }

  private syncFormsFromPayload(payload: Record<string, unknown>): void {
    this.seoForm = seoFormFromPayload(payload);
    this.navigationItems = navigationFromPayload(payload);
    this.footerForm = footerFromPayload(payload);
    this.finalCtaForm = finalCtaFromPayload(payload);
    this.syncHeroFromJson(false);
  }

  onSeoFormChange(form: MarketingSeoForm): void {
    this.seoForm = form;
  }

  applySeoToJson(): void {
    this.withPayloadForEdit(true, (payload) => {
      const merged = applySeoFormToPayload(this.clonePayload(payload), this.seoForm);
      this.jsonText = JSON.stringify(merged, null, 2);
      this.rememberPayload(merged);
      this.jsonError = '';
      this.toast.success('SEO settings applied to JSON.');
      this.cdr.markForCheck();
    });
  }

  syncSeoFromJson(showToast = true): boolean {
    const payload = this.resolvePayloadForEdit();
    if (!payload) {
      if (showToast) {
        this.toast.error('Load valid JSON before editing SEO.');
      }
      this.cdr.markForCheck();
      return false;
    }
    this.seoForm = seoFormFromPayload(payload);
    this.cdr.markForCheck();
    return true;
  }

  private mergeEditorIntoPayload(payload: Record<string, unknown>): Record<string, unknown> {
    let merged = applyStructureToPayload(
      payload,
      this.navigationItems,
      this.footerForm,
      this.finalCtaForm,
    );
    merged = applySeoFormToPayload(merged, this.seoForm);
    merged = this.mergeHeroFields(merged);
    return merged;
  }

  private mergeHeroFields(payload: Record<string, unknown>): Record<string, unknown> {
    const existingHero =
      payload['hero'] !== null && typeof payload['hero'] === 'object' && !Array.isArray(payload['hero'])
        ? (payload['hero'] as Record<string, unknown>)
        : {};
    const ctas = Array.isArray(existingHero['ctas']) ? existingHero['ctas'] : [];
    const existingSeo = payload['seo'];

    payload['hero'] = {
      ...existingHero,
      title: MARKETING_COPY_CONTRACT.slogan,
      supportingLine: MARKETING_COPY_CONTRACT.supportingLine,
      description: this.heroForm.description.trim(),
      image: this.heroForm.image.trim(),
      imageAlt: this.heroForm.imageAlt.trim(),
      ctas,
    };

    if (existingSeo !== undefined) {
      payload['seo'] = existingSeo;
    }

    const site = payload['site'];
    if (site !== null && typeof site === 'object' && !Array.isArray(site)) {
      const s = site as Record<string, unknown>;
      s['slogan'] = MARKETING_COPY_CONTRACT.slogan;
      s['supportingLine'] = MARKETING_COPY_CONTRACT.supportingLine;
      s['tagline'] = MARKETING_COPY_CONTRACT.supportingLine;
    }

    return payload;
  }

  onHeroFormChange(form: MarketingHeroForm): void {
    this.heroForm = form;
  }

  syncHeroFromJson(showToast = true): boolean {
    const payload = this.resolvePayloadForEdit();
    if (!payload) {
      if (showToast) {
        this.toast.error('Load valid JSON before editing the hero.');
      }
      this.cdr.markForCheck();
      return false;
    }
    const hero = payload['hero'];
    if (hero === null || typeof hero !== 'object' || Array.isArray(hero)) {
      if (showToast) this.toast.error('JSON is missing a hero object.');
      return false;
    }
    const h = hero as Record<string, unknown>;
    this.heroForm = {
      description: String(h['description'] ?? ''),
      image: String(h['image'] ?? ''),
      imageAlt: String(h['imageAlt'] ?? ''),
    };
    this.cdr.markForCheck();
    return true;
  }

  applyHeroToJson(): void {
    this.withPayloadForEdit(true, (payload) => {
      const working = this.clonePayload(payload);
      const existingHero =
        working['hero'] !== null && typeof working['hero'] === 'object' && !Array.isArray(working['hero'])
          ? (working['hero'] as Record<string, unknown>)
          : {};
      const ctas = Array.isArray(existingHero['ctas']) ? existingHero['ctas'] : [];

      const existingSeo = working['seo'];

      working['hero'] = {
        ...existingHero,
        title: MARKETING_COPY_CONTRACT.slogan,
        supportingLine: MARKETING_COPY_CONTRACT.supportingLine,
        description: this.heroForm.description.trim(),
        image: this.heroForm.image.trim(),
        imageAlt: this.heroForm.imageAlt.trim(),
        ctas,
      };

      if (existingSeo !== undefined) {
        working['seo'] = existingSeo;
      }

      const site = working['site'];
      if (site !== null && typeof site === 'object' && !Array.isArray(site)) {
        const s = site as Record<string, unknown>;
        s['slogan'] = MARKETING_COPY_CONTRACT.slogan;
        s['supportingLine'] = MARKETING_COPY_CONTRACT.supportingLine;
        s['tagline'] = MARKETING_COPY_CONTRACT.supportingLine;
      }

      this.jsonText = JSON.stringify(working, null, 2);
      this.rememberPayload(working);
      this.jsonError = '';
      this.toast.success('Hero fields applied to JSON. Save draft or publish when ready.');
      this.cdr.markForCheck();
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.jsonText = String(reader.result ?? '');
      this.jsonError = '';
      try {
        const parsed = JSON.parse(this.jsonText) as Record<string, unknown>;
        this.rememberPayload(parsed);
        this.syncFormsFromPayload(parsed);
      } catch {
        /* invalid JSON — forms unchanged */
      }
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
    input.value = '';
  }

  /** Parses only the Full JSON textarea (ignores bootstrap cache). */
  private parseJsonText(showFeedback = false): Record<string, unknown> | null {
    const trimmed = this.jsonText.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.jsonError = 'JSON must be an object matching MarketingContent.';
        if (showFeedback) {
          this.toast.error(this.jsonError);
        }
        return null;
      }
      this.jsonError = '';
      return parsed as Record<string, unknown>;
    } catch {
      this.jsonError = 'Invalid JSON. Fix errors on the Full JSON tab.';
      if (showFeedback) {
        this.toast.error(this.jsonError);
      }
      return null;
    }
  }

  publish(): void {
    this.withPayloadForEdit(true, (payload) => {
      const merged = this.mergeEditorIntoPayload(this.clonePayload(payload));

      const seoWarnings = duplicateSeoTitleWarnings(this.seoForm);
      if (seoWarnings.length > 0) {
        this.toast.warning(seoWarnings[0]);
      }

      this.confirm
        .confirm({
          title: 'Publish marketing website content?',
          message:
            (seoWarnings.length > 0
              ? `${seoWarnings.join(' ')} `
              : '') +
            'This replaces the live public marketing payload read by EkklesiaNexusWeb when CMS mode is enabled. Continue?',
          confirmText: 'Publish',
          cancelText: 'Cancel',
          variant: 'primary',
        })
        .subscribe((result) => {
          if (!result.confirmed) return;
          this.publishing = true;
          this.cdr.markForCheck();
          this.api.publish(merged, this.notes).subscribe({
            next: () => {
              this.toast.success('Marketing content published.');
              this.publishing = false;
              this.notes = '';
              this.reload();
            },
            error: (err: HttpErrorResponse) => {
              const msg =
                err.error?.message ??
                (err.error?.errors?.payload?.[0] as string | undefined) ??
                'Publish failed.';
              this.toast.error(msg);
              this.publishing = false;
              this.cdr.markForCheck();
            },
          });
        });
    });
  }
}
