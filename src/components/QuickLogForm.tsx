import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { BristolType, MovementEntry, SatisfactionRating, Tag } from '../types';
import { bristolDescriptions, satisfactionLabels } from '../lib/health';

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
  1: { summary: 'Very hard', cue: 'Pebble-like lumps', tone: 'constipated', segments: [16, 14, 12, 10] },
  2: { summary: 'Hard', cue: 'Lumpy sausage', tone: 'constipated', segments: [22, 18, 16] },
  3: { summary: 'Firm-normal', cue: 'Sausage with cracks', tone: 'ideal', segments: [28, 24] },
  4: { summary: 'Smooth-normal', cue: 'Smooth, soft sausage', tone: 'ideal', segments: [56] },
  5: { summary: 'Soft', cue: 'Soft blobs', tone: 'loose', segments: [18, 20, 16] },
  6: { summary: 'Mushy', cue: 'Fluffy pieces', tone: 'loose', segments: [12, 14, 16, 18] },
  7: { summary: 'Watery', cue: 'No solid pieces', tone: 'loose', segments: [70] },
};

type QuickLogFormProps = {
  tags: Tag[];
  initialValues: QuickLogValues;
  editingEntry?: MovementEntry | null;
  onSubmit: (values: QuickLogValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function QuickLogForm({ tags, initialValues, editingEntry, onSubmit, onCancel }: QuickLogFormProps) {
  const form = useForm<QuickLogValues>({
    resolver: zodResolver(schema) as Resolver<QuickLogValues>,
    defaultValues: initialValues,
  });
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const feedbackTimerRef = useRef<number | null>(null);

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
  }, [form, initialValues]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

  const selectedTags = form.watch('tags');

  return (
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
                    className={field.value === rating ? 'segmented-control__button is-active' : 'segmented-control__button'}
                    onClick={() => field.onChange(rating)}
                  >
                    <span>{rating}</span>
                    <small>{satisfactionLabels[rating as keyof typeof satisfactionLabels]}</small>
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div className="field-group">
          <label htmlFor="bristolType">Bristol stool type</label>
          <p className="helper-text">Hard to loose scale. Types 3-4 are usually the most comfortable for many people.</p>
          <Controller
            control={form.control}
            name="bristolType"
            render={({ field }) => (
              <div className="bristol-grid" role="radiogroup" aria-label="Bristol stool type">
                {[1, 2, 3, 4, 5, 6, 7].map((type) => {
                  const guide = bristolVisualGuide[type as BristolType];
                  const activeClass = field.value === type ? ' is-active' : '';
                  return (
                  <button
                    key={type}
                    type="button"
                    className={`bristol-card bristol-card--${guide.tone}${activeClass}`}
                    onClick={() => field.onChange(type)}
                  >
                    <span className="bristol-card__type">Type {type}</span>
                    <span className="bristol-card__summary">{guide.summary}</span>
                    <span className="bristol-card__visual" aria-hidden="true">
                      {guide.segments.map((segmentWidth, index) => (
                        <span key={`${type}-${index}`} className="bristol-card__segment" style={{ width: `${segmentWidth}%` }} />
                      ))}
                    </span>
                    <small>{bristolDescriptions[type as keyof typeof bristolDescriptions]}</small>
                    <small className="bristol-card__cue">{guide.cue}</small>
                  </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        <div className="field-group field-group--wide">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" className="textarea" placeholder="Optional context, food, symptoms, or anything noteworthy." {...form.register('notes')} />
        </div>

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
      </div>

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

      {submitState === 'saved' ? <p className="form-feedback form-feedback--success">Saved. Your entry has been recorded.</p> : null}
      {submitState === 'error' ? <p className="form-feedback form-feedback--error">Could not save this entry. Please try again.</p> : null}
    </form>
  );
}
