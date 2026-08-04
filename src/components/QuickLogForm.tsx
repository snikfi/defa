import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Controller, type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { BristolType, MovementEntry, SatisfactionRating, Tag } from '../types';
import { satisfactionLabels } from '../lib/health';

export type QuickLogValues = {
  satisfactionRating: SatisfactionRating;
  bristolType: BristolType;
  notes: string;
  tags: string[];
};

const satisfactionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const bristolTypeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

const schema = z.object({
  satisfactionRating: satisfactionSchema,
  bristolType: bristolTypeSchema,
  notes: z.string().max(1000),
  tags: z.array(z.string()),
}) satisfies z.ZodType<QuickLogValues>;

const bristolVisualGuide: Record<BristolType, { summary: string; cue: string; tone: 'constipated' | 'ideal' | 'loose'; segments: number[] }> = {
  1: { summary: 'Very hard', cue: 'Separate hard lumps, like nuts (hard to pass)', tone: 'constipated', segments: [16, 14, 12, 10] },
  2: { summary: 'Hard', cue: 'Sausage-shaped but lumpy', tone: 'constipated', segments: [22, 18, 16] },
  3: { summary: 'Firm-normal', cue: 'Like a sausage but with cracks on the surface', tone: 'ideal', segments: [28, 24] },
  4: { summary: 'Smooth-normal', cue: 'Like a sausage or snake, smooth and soft', tone: 'ideal', segments: [56] },
  5: { summary: 'Soft', cue: 'Soft blobs with clear-cut edges', tone: 'loose', segments: [18, 20, 16] },
  6: { summary: 'Mushy', cue: 'Fluffy pieces with ragged edges, a mushy poo', tone: 'loose', segments: [12, 14, 16, 18] },
  7: { summary: 'Watery', cue: 'Watery, no solid pieces. Entirely liquid', tone: 'loose', segments: [70] },
};

const bristolIllustrationByType: Partial<Record<BristolType, string>> = {
  1: '/bristol/type-1.svg',
  2: '/bristol/type-2.svg',
  3: '/bristol/type-3.svg',
  4: '/bristol/type-4.svg',
  5: '/bristol/type-5.svg',
  6: '/bristol/type-6.svg',
  7: '/bristol/type-7.svg',
};

const satisfactionToneClass: Record<SatisfactionRating, string> = {
  1: 'segmented-control__button--rating-1',
  2: 'segmented-control__button--rating-2',
  3: 'segmented-control__button--rating-3',
  4: 'segmented-control__button--rating-4',
  5: 'segmented-control__button--rating-5',
};

type QuickLogFormProps = {
  tags: Tag[];
  initialValues: QuickLogValues;
  editingEntry?: MovementEntry | null;
  progressive?: boolean;
  onSubmit: (values: QuickLogValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function QuickLogForm({ tags, initialValues, editingEntry, progressive = false, onSubmit, onCancel }: QuickLogFormProps) {
  const form = useForm<QuickLogValues>({
    resolver: zodResolver(schema) as Resolver<QuickLogValues>,
    defaultValues: initialValues,
  });

  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [hasChosenSatisfaction, setHasChosenSatisfaction] = useState(!progressive || Boolean(editingEntry));
  const [hasChosenBristol, setHasChosenBristol] = useState(!progressive || Boolean(editingEntry));
  const [showBristolChart, setShowBristolChart] = useState(false);
  const feedbackTimerRef = useRef<number | null>(null);

  const isProgressive = progressive && !editingEntry;

  const submitHandler: SubmitHandler<QuickLogValues> = async (values) => {
    setSubmitState('saving');

    try {
      await Promise.resolve(onSubmit(values));
      setSubmitState('saved');

      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }

      feedbackTimerRef.current = window.setTimeout(() => {
        setSubmitState('idle');
      }, 2200);
    } catch {
      setSubmitState('error');
    }
  };

  useEffect(() => {
    form.reset(initialValues);
    setActiveStep(1);
    setShowBristolChart(false);

    if (isProgressive) {
      setHasChosenSatisfaction(false);
      setHasChosenBristol(false);
      return;
    }

    setHasChosenSatisfaction(true);
    setHasChosenBristol(true);
  }, [form, initialValues, isProgressive]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!showBristolChart) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowBristolChart(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showBristolChart]);

  const selectedTags = form.watch('tags');

  const bristolChartModal = showBristolChart && typeof document !== 'undefined'
    ? createPortal(
      <div className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="bristol-chart-title">
        <div className="edit-modal__backdrop" onClick={() => setShowBristolChart(false)} />
        <section className="edit-modal__panel bristol-chart-modal">
          <div className="edit-modal__header">
            <p className="eyebrow">Reference</p>
            <h2 id="bristol-chart-title">Bristol stool chart</h2>
            <p className="helper-text">Use this chart as a quick guide when selecting a Bristol type.</p>
          </div>

          <div className="bristol-chart-modal__image-shell">
            <img
              src="/Bristol_Stool_Chart.webp"
              alt="Bristol stool chart with stool types 1 through 7"
              className="bristol-chart-modal__image"
            />
          </div>

          <div className="quick-log-form__footer">
            <button type="button" className="ghost-button" onClick={() => setShowBristolChart(false)}>
              Close chart
            </button>
          </div>
        </section>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <form className="quick-log-form" onSubmit={form.handleSubmit(submitHandler)}>
        <div className="quick-log-form__grid">
          <div className="field-group">
            <label htmlFor="satisfactionRating">Satisfaction</label>
            <Controller
              control={form.control}
              name="satisfactionRating"
              render={({ field }) => (
                <div className="segmented-control" role="radiogroup" aria-label="Satisfaction rating">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={[
                        'segmented-control__button',
                        satisfactionToneClass[rating as SatisfactionRating],
                        hasChosenSatisfaction && field.value === rating ? 'is-active' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        field.onChange(rating);
                        setHasChosenSatisfaction(true);
                        if (isProgressive) {
                          setActiveStep((current) => (current < 2 ? 2 : current));
                        }
                      }}
                    >
                      <span className="segmented-control__score">{rating}</span>
                      <small>{satisfactionLabels[rating as keyof typeof satisfactionLabels]}</small>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {!isProgressive || activeStep >= 2 ? (
            <div className="field-group">
              <div className="field-group__heading">
                <label htmlFor="bristolType">Bristol stool type</label>
                <button
                  type="button"
                  className="ghost-button bristol-chart-trigger"
                  aria-haspopup="dialog"
                  aria-label="Open Bristol stool chart"
                  onClick={() => setShowBristolChart(true)}
                >
                  <span className="bristol-chart-trigger__icon" aria-hidden="true">i</span>
                  <span>Chart</span>
                </button>
              </div>
              <p className="helper-text">Hard to loose scale. Types 3-4 are usually the most comfortable for many people.</p>
              <Controller
                control={form.control}
                name="bristolType"
                render={({ field }) => (
                  <div className="bristol-grid" role="radiogroup" aria-label="Bristol stool type">
                    {[1, 2, 3, 4, 5, 6, 7].map((type) => {
                      const guide = bristolVisualGuide[type as BristolType];
                      const activeClass = hasChosenBristol && field.value === type ? ' is-active' : '';

                      return (
                        <button
                          key={type}
                          type="button"
                          className={`bristol-card bristol-card--${guide.tone}${activeClass}`}
                          onClick={() => {
                            field.onChange(type);
                            setHasChosenBristol(true);
                            if (isProgressive) {
                              setActiveStep((current) => (current < 3 ? 3 : current));
                            }
                          }}
                        >
                          <div className="bristol-card__main">
                            {bristolIllustrationByType[type as BristolType] ? (
                              <span className="bristol-card__visual bristol-card__visual--illustration" aria-hidden="true">
                                <img
                                  src={bristolIllustrationByType[type as BristolType]}
                                  alt=""
                                  className="bristol-card__illustration"
                                />
                              </span>
                            ) : (
                              <span className="bristol-card__visual" aria-hidden="true">
                                {guide.segments.map((segmentWidth, index) => (
                                  <span key={`${type}-${index}`} className="bristol-card__segment" style={{ width: `${segmentWidth}%` }} />
                                ))}
                              </span>
                            )}
                            <span className="bristol-card__copy">
                              <span className="bristol-card__type">Type {type}</span>
                              <span className="bristol-card__summary">{guide.summary}</span>
                              <small className="bristol-card__cue">{guide.cue}</small>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          ) : null}

          {!isProgressive || activeStep >= 3 ? (
            <>
              <div className="field-group field-group--wide">
                <label>Tags</label>
                <div className="tag-picker">
                  {tags.map((tag) => {
                    const selected = selectedTags.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={selected ? 'chip chip--active' : 'chip'}
                        onClick={() => {
                          const next = selected ? selectedTags.filter((value) => value !== tag.id) : [...selectedTags, tag.id];
                          form.setValue('tags', next, { shouldDirty: true });
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field-group field-group--wide">
                <label htmlFor="notes">Notes</label>
                <textarea id="notes" className="textarea" placeholder="Optional context, food, symptoms, or anything noteworthy." {...form.register('notes')} />
              </div>
            </>
          ) : null}
        </div>

        {!isProgressive || activeStep >= 3 ? (
          <div className="quick-log-form__footer">
            {editingEntry ? (
              <button type="button" className="ghost-button" onClick={onCancel}>
                Cancel edit
              </button>
            ) : null}
            <button type="submit" className="primary-button" disabled={submitState === 'saving'}>
              {submitState === 'saving'
                ? (editingEntry ? 'Updating...' : 'Recording...')
                : submitState === 'saved'
                  ? (editingEntry ? 'Updated' : 'Recorded')
                  : (editingEntry ? 'Update movement' : 'Record bowel movement')}
            </button>
          </div>
        ) : null}

        {submitState === 'saved' ? <p className="form-feedback form-feedback--success">Saved. Your entry has been recorded.</p> : null}
        {submitState === 'error' ? <p className="form-feedback form-feedback--error">Could not save this entry. Please try again.</p> : null}
      </form>
      {bristolChartModal}
    </>
  );
}
