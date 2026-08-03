import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { MovementEntry, Tag } from '../types';
import { bristolDescriptions, satisfactionLabels } from '../lib/health';

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
  satisfactionRating: z.coerce.number().int().pipe(satisfactionSchema),
  bristolType: z.coerce.number().int().pipe(bristolTypeSchema),
  notes: z.string().max(1000),
  tags: z.array(z.string()),
});

export type QuickLogValues = z.infer<typeof schema>;

type QuickLogFormProps = {
  tags: Tag[];
  initialValues: QuickLogValues;
  editingEntry?: MovementEntry | null;
  onSubmit: (values: QuickLogValues) => void;
  onCancel?: () => void;
};

export function QuickLogForm({ tags, initialValues, editingEntry, onSubmit, onCancel }: QuickLogFormProps) {
  const form = useForm<QuickLogValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const submitHandler: SubmitHandler<QuickLogValues> = (values) => {
    onSubmit(values);
  };

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

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
          <Controller
            control={form.control}
            name="bristolType"
            render={({ field }) => (
              <div className="bristol-grid" role="radiogroup" aria-label="Bristol stool type">
                {[1, 2, 3, 4, 5, 6, 7].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={field.value === type ? 'bristol-card is-active' : 'bristol-card'}
                    onClick={() => field.onChange(type)}
                  >
                    <span className="bristol-card__type">Type {type}</span>
                    <span className="bristol-card__shape" aria-hidden="true">
                      {type === 1 || type === 2 ? '◔' : type === 3 || type === 4 ? '◕' : '◯'}
                    </span>
                    <small>{bristolDescriptions[type as keyof typeof bristolDescriptions]}</small>
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div className="field-group field-group--wide">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" className="textarea" placeholder="Optional context, food, symptoms, or anything noteworthy." {...form.register('notes')} />
          <p className="helper-text">Speech-to-text can be added later for supported browsers.</p>
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
        <button type="submit" className="primary-button">
          {editingEntry ? 'Update movement' : 'Record bowel movement'}
        </button>
      </div>
    </form>
  );
}
