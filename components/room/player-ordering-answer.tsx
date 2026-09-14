'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SortableOrderingItem({
  item,
  position,
  disabled,
}: {
  item: string;
  position: number;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm',
        isDragging && 'relative z-10 border-primary shadow-lg'
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
        {position}
      </span>
      <span className="min-w-0 flex-1 font-medium">{item}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
        disabled={disabled}
        aria-label={`Move ${item}. Current position ${position}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" />
      </Button>
    </li>
  );
}

function parsePlayerOrderingAnswer(answer: string, fallback: string[]) {
  try {
    const parsed = JSON.parse(answer) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === fallback.length &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed;
    }
  } catch {
    // Use the server-provided shuffled order when no local answer exists yet.
  }
  return fallback;
}

export function PlayerOrderingAnswer({
  answer,
  initialItems,
  disabled,
  onAnswerChange,
}: {
  answer: string;
  initialItems: string[];
  disabled: boolean;
  onAnswerChange: (value: string) => void;
}) {
  const items = parsePlayerOrderingAnswer(answer, initialItems);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = items.indexOf(String(event.active.id));
    const newIndex = items.indexOf(String(event.over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onAnswerChange(JSON.stringify(arrayMove(items, oldIndex, newIndex)));
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-sm text-muted-foreground">
        Drag the items into the correct order. Keyboard users can focus a drag
        handle, press Space, then use the arrow keys.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label="Items to put in order">
            {items.map((item, index) => (
              <SortableOrderingItem
                key={item}
                item={item}
                position={index + 1}
                disabled={disabled}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
