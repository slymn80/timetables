import { useEffect, useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

interface TimetableGridProps {
  timetableId: string;
  filterType?: 'class' | 'teacher' | null;
  filterEntityId?: string | null;
}

interface TimeSlot {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  label?: string;
}

interface TimetableEntry {
  id: string;
  time_slot_id: string;
  class_id: string; // For filtering
  teacher_id?: string; // For filtering
  lesson: {
    id: string;
    subject: {
      name: string;
      short_code: string;
      color_code?: string;
    };
    teacher?: {
      first_name: string;
      last_name: string;
      short_name?: string;
    } | null;
    class: {
      name: string;
    };
  };
  lesson_group_name?: string; // Group name for split lessons
  room?: {
    name: string;
    short_name?: string;
  };
  is_locked: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Draggable lesson block component
function DraggableLessonBlock({
  entry,
  isPartOfConsecutive,
  isSelected,
  onSelect,
}: {
  entry: TimetableEntry;
  isPartOfConsecutive?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: entry,
    disabled: entry.is_locked,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const bgColor = entry.lesson.subject.color_code || '#3B82F6';
  const hasTeacher = entry.lesson.teacher !== null && entry.lesson.teacher !== undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (onSelect && !entry.is_locked) {
          e.stopPropagation();
          onSelect();
        }
      }}
      className={`
        text-xs p-2 rounded transition-all
        ${isDragging ? 'opacity-50' : ''}
        ${entry.is_locked ? 'cursor-not-allowed' : 'cursor-move hover:shadow-lg'}
        ${!hasTeacher ? 'border-2 border-dashed border-orange-400' : ''}
        ${isPartOfConsecutive ? 'ring-2 ring-purple-400 ring-offset-1' : ''}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
      `}
      title={
        entry.is_locked
          ? 'Locked - Cannot move'
          : isPartOfConsecutive
          ? 'Part of consecutive group - will move together'
          : isSelected
          ? 'Selected - Click to deselect'
          : 'Click to select, drag to move'
      }
    >
      <div className="space-y-1">
        <div
          className="font-semibold flex items-center justify-between"
          style={{ color: bgColor }}
        >
          <span>{entry.lesson.subject.short_code}</span>
          {entry.is_locked && <span className="text-xs">🔒</span>}
          {!hasTeacher && <span className="text-orange-500 text-xs">⚠️</span>}
        </div>
        {entry.lesson_group_name && (
          <div className="text-xs font-medium text-blue-600">
            {entry.lesson_group_name}
          </div>
        )}
        <div className="text-gray-700">
          {entry.lesson.teacher
            ? entry.lesson.teacher.short_name ||
              `${entry.lesson.teacher.first_name.charAt(0)}. ${entry.lesson.teacher.last_name}`
            : 'Unassigned'}
        </div>
        <div className="text-gray-500 text-xs">{entry.lesson.class.name}</div>
        {entry.room && (
          <div className="text-gray-500 text-xs">
            {entry.room.short_name || entry.room.name}
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable cell component
function DroppableCell({
  slotId,
  entries,
  consecutiveEntryIds,
  selectedEntryIds,
  onSelectEntry,
  isDragging,
  isAvailable,
  hasConflict,
  canSwap,
}: {
  slotId: string;
  entries: TimetableEntry[];
  consecutiveEntryIds?: string[];
  selectedEntryIds?: string[];
  onSelectEntry?: (entryId: string) => void;
  isDragging?: boolean;
  isAvailable?: boolean;
  hasConflict?: boolean;
  canSwap?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
  });

  const hasEntries = entries.length > 0;
  const bgColor = hasEntries ? entries[0].lesson.subject.color_code : undefined;

  // Determine cell styling based on drag state
  let cellStyle = '';
  let borderStyle = 'border-gray-300';

  if (isDragging) {
    if (isAvailable) {
      // Available slot during drag - green
      cellStyle = 'bg-green-100';
      borderStyle = 'border-green-400 border-2';
    } else if (hasConflict) {
      // Conflicting slot during drag - red
      cellStyle = 'bg-red-100';
      borderStyle = 'border-red-400 border-2';
    } else if (canSwap) {
      // Can swap with existing entry - orange
      cellStyle = 'bg-orange-100';
      borderStyle = 'border-orange-400 border-2';
    }
  } else if (isOver) {
    cellStyle = 'bg-blue-100 ring-2 ring-blue-500';
  } else if (!hasEntries) {
    cellStyle = 'hover:bg-blue-50';
  }

  return (
    <td
      ref={setNodeRef}
      className={`
        border px-2 py-2 min-h-[80px] transition-all
        ${borderStyle}
        ${cellStyle}
        ${!hasEntries ? 'cursor-pointer' : ''}
      `}
      style={
        !isDragging && hasEntries && bgColor
          ? { backgroundColor: `${bgColor}20` }
          : undefined
      }
    >
      {entries.length > 0 ? (
        <div className="space-y-1">
          {entries.map((entry) => (
            <DraggableLessonBlock
              key={entry.id}
              entry={entry}
              isPartOfConsecutive={consecutiveEntryIds?.includes(entry.id)}
              isSelected={selectedEntryIds?.includes(entry.id)}
              onSelect={() => onSelectEntry?.(entry.id)}
            />
          ))}
          {isDragging && canSwap && (
            <div className="text-center text-orange-600 text-xs font-medium mt-1">
              ⇄ Swap
            </div>
          )}
        </div>
      ) : isDragging && isAvailable ? (
        <div className="text-center text-green-600 text-xs font-medium py-4">
          ✓ Available
        </div>
      ) : isDragging && hasConflict ? (
        <div className="text-center text-red-600 text-xs font-medium py-4">
          ✗ Conflict
        </div>
      ) : null}
    </td>
  );
}

interface MoveHistoryItem {
  movedEntries: { entryId: string; fromSlotId: string; toSlotId: string }[];
  swappedEntries?: { entryId: string; fromSlotId: string; toSlotId: string }[];
}

export default function TimetableGrid({ timetableId, filterType, filterEntityId }: TimetableGridProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<TimetableEntry | null>(null);
  const [movingWithConsecutive, setMovingWithConsecutive] = useState(true); // Toggle for moving consecutive slots together
  const [consecutiveEntryIds, setConsecutiveEntryIds] = useState<string[]>([]); // IDs of consecutive entries being moved
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]); // Manually selected entries

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTimetableData();
  }, [timetableId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, moveHistory]);

  const loadTimetableData = async () => {
    try {
      // Fetch time slots from API
      const slotsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/time-slots/?is_active=true`);
      const slotsData = await slotsResponse.json();

      // Filter out breaks and map to our format
      const slots: TimeSlot[] = (slotsData.time_slots || [])
        .filter((slot: any) => !slot.is_break)
        .map((slot: any) => ({
          id: slot.id,
          day_of_week: slot.day.charAt(0).toUpperCase() + slot.day.slice(1).toLowerCase(), // friday -> Friday
          period_number: slot.period_number,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
          label: slot.label,
        }));

      setTimeSlots(slots);

      // Fetch timetable entries from API
      const entriesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/timetables/${timetableId}/entries/`);
      const entriesData = await entriesResponse.json();

      // Transform flat API response to nested format expected by frontend
      const transformedEntries: TimetableEntry[] = entriesData.entries.map((entry: any) => ({
        id: entry.id,
        time_slot_id: entry.time_slot_id,
        class_id: entry.class_id, // For filtering
        teacher_id: entry.teacher_id, // For filtering
        lesson: {
          id: entry.lesson_id,
          subject: {
            name: entry.subject_name || 'Unknown',
            short_code: entry.subject_short_code || entry.subject_name?.substring(0, 4).toUpperCase() || 'SUBJ',
            color_code: entry.subject_color,
          },
          teacher: entry.teacher_name ? {
            first_name: entry.teacher_name.split(' ')[0] || '',
            last_name: entry.teacher_name.split(' ').slice(1).join(' ') || '',
            short_name: entry.teacher_short_name,
          } : null,
          class: {
            name: entry.class_name || 'Unknown',
          },
        },
        lesson_group_name: entry.lesson_group_name, // Add group name for display
        room: entry.room_name ? {
          name: entry.room_name,
          short_name: entry.room_short_name,
        } : undefined,
        is_locked: entry.is_locked || false,
      }));

      setEntries(transformedEntries);
      setLoading(false);
    } catch (error) {
      console.error('Error loading timetable data:', error);
      setLoading(false);

      // Fallback to empty data on error
      setTimeSlots([]);
      setEntries([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading timetable...</div>
      </div>
    );
  }


  // Find all group lesson entries (same lesson_id, different groups, same time slot)
  const findGroupLessonEntries = (entry: TimetableEntry): TimetableEntry[] => {
    if (!entry.lesson_group_name) {
      return [entry]; // Not a group lesson
    }

    // Find all entries with same lesson_id that are in the same time slot
    const currentSlot = timeSlots.find((s) => s.id === entry.time_slot_id);
    if (!currentSlot) return [entry];

    const groupEntries = entries.filter(
      (e) => {
        // Skip self
        if (e.id === entry.id) return false;

        // Same lesson ID (all groups of same lesson have same lesson.id)
        const isSameLesson = e.lesson.id === entry.lesson.id;
        const hasGroupName = !!e.lesson_group_name;

        // Same time slot (same day and period)
        const targetSlot = timeSlots.find((s) => s.id === e.time_slot_id);
        const isSameTimeSlot = targetSlot &&
          targetSlot.day_of_week === currentSlot.day_of_week &&
          targetSlot.period_number === currentSlot.period_number;

        return isSameLesson && hasGroupName && isSameTimeSlot;
      }
    );

    // Include the original entry plus all group siblings
    return [entry, ...groupEntries];
  };

  // Find consecutive slots for the same lesson on the same day
  const findConsecutiveSlots = (entry: TimetableEntry): TimetableEntry[] => {
    const currentSlot = timeSlots.find((s) => s.id === entry.time_slot_id);
    if (!currentSlot) return [entry];

    // Get all entries for the same lesson on the same day
    const sameLessonEntries = entries.filter(
      (e) =>
        e.lesson.id === entry.lesson.id &&
        e.id !== entry.id &&
        timeSlots.find(
          (s) =>
            s.id === e.time_slot_id &&
            s.day_of_week === currentSlot.day_of_week
        )
    );

    // Sort by period number
    const allEntries = [entry, ...sameLessonEntries].sort((a, b) => {
      const slotA = timeSlots.find((s) => s.id === a.time_slot_id);
      const slotB = timeSlots.find((s) => s.id === b.time_slot_id);
      return (slotA?.period_number || 0) - (slotB?.period_number || 0);
    });

    // Find consecutive sequence containing the dragged entry
    const consecutiveGroup: TimetableEntry[] = [];
    let foundEntry = false;

    for (let i = 0; i < allEntries.length; i++) {
      const currentEntry = allEntries[i];
      const currentEntrySlot = timeSlots.find(
        (s) => s.id === currentEntry.time_slot_id
      );

      if (currentEntry.id === entry.id) {
        foundEntry = true;
        consecutiveGroup.push(currentEntry);
        continue;
      }

      if (consecutiveGroup.length === 0) {
        // Before finding the dragged entry, check if this entry is consecutive to the next
        const nextEntry = allEntries[i + 1];
        if (nextEntry && nextEntry.id === entry.id) {
          const nextSlot = timeSlots.find((s) => s.id === nextEntry.time_slot_id);
          if (
            currentEntrySlot &&
            nextSlot &&
            nextSlot.period_number === currentEntrySlot.period_number + 1
          ) {
            consecutiveGroup.push(currentEntry);
          }
        }
      } else if (foundEntry) {
        // After finding the dragged entry, check if this entry is consecutive to the previous
        const prevEntry = consecutiveGroup[consecutiveGroup.length - 1];
        const prevSlot = timeSlots.find((s) => s.id === prevEntry.time_slot_id);
        if (
          currentEntrySlot &&
          prevSlot &&
          currentEntrySlot.period_number === prevSlot.period_number + 1
        ) {
          consecutiveGroup.push(currentEntry);
        } else {
          break; // Stop if not consecutive
        }
      }
    }

    return consecutiveGroup.length > 0 ? consecutiveGroup : [entry];
  };

  // Check for conflicts (teacher, class, room availability)
  const hasConflict = (
    entry: TimetableEntry,
    targetSlotId: string
  ): { hasConflict: boolean; reason?: string } => {
    const targetSlot = timeSlots.find((s) => s.id === targetSlotId);
    if (!targetSlot) return { hasConflict: true, reason: 'Invalid time slot' };

    // Find all entries in the target slot
    const targetEntries = entries.filter((e) => e.time_slot_id === targetSlotId);

    for (const targetEntry of targetEntries) {
      // Check class conflict
      if (entry.lesson.class.name === targetEntry.lesson.class.name) {
        return {
          hasConflict: true,
          reason: `Class ${entry.lesson.class.name} is already scheduled`,
        };
      }

      // Check teacher conflict (if both have teachers)
      if (
        entry.lesson.teacher &&
        targetEntry.lesson.teacher &&
        `${entry.lesson.teacher.first_name} ${entry.lesson.teacher.last_name}` ===
          `${targetEntry.lesson.teacher.first_name} ${targetEntry.lesson.teacher.last_name}`
      ) {
        return {
          hasConflict: true,
          reason: `Teacher ${entry.lesson.teacher.first_name} ${entry.lesson.teacher.last_name} is already scheduled`,
        };
      }

      // Check room conflict (if both have rooms)
      if (entry.room && targetEntry.room && entry.room.name === targetEntry.room.name) {
        return {
          hasConflict: true,
          reason: `Room ${entry.room.name} is already occupied`,
        };
      }
    }

    return { hasConflict: false };
  };

  const handleSelectEntry = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // If clicking on already selected entry, deselect all
    if (selectedEntryIds.includes(entryId)) {
      setSelectedEntryIds([]);
      return;
    }

    // Find all group entries for this lesson
    const groupEntries = findGroupLessonEntries(entry);
    const groupIds = groupEntries.map((e) => e.id);

    setSelectedEntryIds(groupIds);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const entry = entries.find((e) => e.id === event.active.id);
    setActiveEntry(entry || null);

    if (!entry) return;

    // If there are manually selected entries, use those
    if (selectedEntryIds.length > 0 && selectedEntryIds.includes(entry.id)) {
      // Use selected entries
      setConsecutiveEntryIds(selectedEntryIds);
      return;
    }

    // Otherwise, auto-detect group lessons
    const groupEntries = findGroupLessonEntries(entry);

    // Then find consecutive slots for all group entries
    if (movingWithConsecutive) {
      const allEntriesToMove = new Set<string>();

      groupEntries.forEach((groupEntry) => {
        const consecutive = findConsecutiveSlots(groupEntry);
        consecutive.forEach((e) => allEntriesToMove.add(e.id));
      });

      setConsecutiveEntryIds(Array.from(allEntriesToMove));
    } else {
      // Just move the group entries without consecutive
      setConsecutiveEntryIds(groupEntries.map((e) => e.id));
    }
  };

  const addToHistory = (historyItem: MoveHistoryItem) => {
    // Clear any redo history
    const newHistory = moveHistory.slice(0, historyIndex + 1);
    newHistory.push(historyItem);
    setMoveHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = async () => {
    if (historyIndex < 0) return;

    const historyItem = moveHistory[historyIndex];

    // Revert the move
    setEntries((prev) =>
      prev.map((entry) => {
        // Revert moved entries
        const movedEntry = historyItem.movedEntries.find((m) => m.entryId === entry.id);
        if (movedEntry) {
          return { ...entry, time_slot_id: movedEntry.fromSlotId };
        }

        // Revert swapped entries
        if (historyItem.swappedEntries) {
          const swappedEntry = historyItem.swappedEntries.find((s) => s.entryId === entry.id);
          if (swappedEntry) {
            return { ...entry, time_slot_id: swappedEntry.fromSlotId };
          }
        }

        return entry;
      })
    );

    setHistoryIndex(historyIndex - 1);

    // Persist to backend
    try {
      const allEntries = [...historyItem.movedEntries];
      if (historyItem.swappedEntries) {
        allEntries.push(...historyItem.swappedEntries);
      }

      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/timetables/${timetableId}/entries/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry_ids: allEntries.map((e) => e.entryId),
            target_slot_ids: allEntries.map((e) => e.fromSlotId),
          }),
        }
      );
    } catch (error) {
      console.error('Error persisting undo:', error);
      await loadTimetableData();
    }
  };

  const handleRedo = async () => {
    if (historyIndex >= moveHistory.length - 1) return;

    const historyItem = moveHistory[historyIndex + 1];

    // Redo the move
    setEntries((prev) =>
      prev.map((entry) => {
        // Redo moved entries
        const movedEntry = historyItem.movedEntries.find((m) => m.entryId === entry.id);
        if (movedEntry) {
          return { ...entry, time_slot_id: movedEntry.toSlotId };
        }

        // Redo swapped entries
        if (historyItem.swappedEntries) {
          const swappedEntry = historyItem.swappedEntries.find((s) => s.entryId === entry.id);
          if (swappedEntry) {
            return { ...entry, time_slot_id: swappedEntry.toSlotId };
          }
        }

        return entry;
      })
    );

    setHistoryIndex(historyIndex + 1);

    // Persist to backend
    try {
      const allEntries = [...historyItem.movedEntries];
      if (historyItem.swappedEntries) {
        allEntries.push(...historyItem.swappedEntries);
      }

      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/timetables/${timetableId}/entries/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry_ids: allEntries.map((e) => e.entryId),
            target_slot_ids: allEntries.map((e) => e.toSlotId),
          }),
        }
      );
    } catch (error) {
      console.error('Error persisting redo:', error);
      await loadTimetableData();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEntry(null);
    setConsecutiveEntryIds([]); // Clear highlighting
    setSelectedEntryIds([]); // Clear selection after drag

    if (!over) return;

    const activeEntry = entries.find((e) => e.id === active.id);
    if (!activeEntry) return;

    const newSlotId = over.id as string;

    // Check if dropping on the same slot
    if (activeEntry.time_slot_id === newSlotId) return;

    let entriesToMove: TimetableEntry[] = [];

    // If user manually selected entries, use those
    if (selectedEntryIds.length > 0 && selectedEntryIds.includes(activeEntry.id)) {
      entriesToMove = entries.filter((e) => selectedEntryIds.includes(e.id));
    } else {
      // Otherwise, auto-detect group lessons and consecutive slots
      const groupEntries = findGroupLessonEntries(activeEntry);

      if (movingWithConsecutive) {
        const allEntries = new Set<TimetableEntry>();
        groupEntries.forEach((groupEntry) => {
          const consecutive = findConsecutiveSlots(groupEntry);
          consecutive.forEach((e) => allEntries.add(e));
        });
        entriesToMove = Array.from(allEntries);
      } else {
        entriesToMove = groupEntries;
      }
    }

    // Calculate target slots for all consecutive entries
    const targetSlot = timeSlots.find((s) => s.id === newSlotId);
    if (!targetSlot) return;

    const targetSlots: string[] = [];
    const currentSlots: string[] = [];

    // Determine if we're moving group lessons or consecutive lessons
    // Check if all entries are in the same time slot (group lessons)
    const allEntriesInSameSlot = entriesToMove.every(
      (e) => e.time_slot_id === entriesToMove[0].time_slot_id
    );
    const hasGroupLessons = allEntriesInSameSlot && entriesToMove.length > 1;

    if (hasGroupLessons && !movingWithConsecutive) {
      // For group lessons without consecutive mode, all entries go to the same time slot
      for (let i = 0; i < entriesToMove.length; i++) {
        const sourceEntry = entriesToMove[i];
        currentSlots.push(sourceEntry.time_slot_id);
        targetSlots.push(newSlotId); // All go to the same target slot
      }
    } else {
      // For consecutive lessons or group lessons with consecutive mode
      for (let i = 0; i < entriesToMove.length; i++) {
        const sourceEntry = entriesToMove[i];
        currentSlots.push(sourceEntry.time_slot_id);

        // Find target slot for this entry (consecutive periods)
        const targetPeriod = targetSlot.period_number + i;
        const targetSlotForEntry = timeSlots.find(
          (s) =>
            s.day_of_week === targetSlot.day_of_week &&
            s.period_number === targetPeriod
        );

        if (!targetSlotForEntry) {
          alert(`Not enough consecutive periods available (need ${entriesToMove.length})`);
          return;
        }

        targetSlots.push(targetSlotForEntry.id);
      }
    }

    // Check for conflicts on each target slot
    for (let i = 0; i < entriesToMove.length; i++) {
      const entryToMove = entriesToMove[i];
      const targetSlotId = targetSlots[i];

      // Skip conflict check if target is one of the source slots (for swap)
      if (currentSlots.includes(targetSlotId)) continue;

      const conflictCheck = hasConflict(entryToMove, targetSlotId);
      if (conflictCheck.hasConflict) {
        alert(`Cannot move: ${conflictCheck.reason}`);
        return;
      }
    }

    // Check if target slots have entries (for swap)
    const targetEntries = entries.filter((e) => targetSlots.includes(e.time_slot_id));

    if (targetEntries.length > 0) {
      // SWAP MODE
      const confirmSwap = window.confirm(
        `Swap ${entriesToMove.length} slot(s) with ${targetEntries.length} slot(s)?`
      );
      if (!confirmSwap) return;

      // Check if we can swap (target entries should also be consecutive from same lesson if multiple)
      if (targetEntries.length !== entriesToMove.length) {
        alert('Can only swap with equal number of consecutive slots');
        return;
      }

      // Check reverse conflicts (target entries moving to source slots)
      for (let i = 0; i < targetEntries.length; i++) {
        const targetEntry = targetEntries[i];
        const sourceSlotId = currentSlots[i];

        const conflictCheck = hasConflict(targetEntry, sourceSlotId);
        if (conflictCheck.hasConflict) {
          alert(`Cannot swap: ${conflictCheck.reason}`);
          return;
        }
      }

      // Perform swap in UI immediately (optimistic update)
      setEntries((prev) =>
        prev.map((entry) => {
          // Move source entries to target slots
          const sourceIndex = entriesToMove.findIndex((e) => e.id === entry.id);
          if (sourceIndex !== -1) {
            return { ...entry, time_slot_id: targetSlots[sourceIndex] };
          }

          // Move target entries to source slots
          const targetIndex = targetEntries.findIndex((e) => e.id === entry.id);
          if (targetIndex !== -1) {
            return { ...entry, time_slot_id: currentSlots[targetIndex] };
          }

          return entry;
        })
      );

      console.log('Swapped entries');

      // Call backend API to persist swap
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/timetables/${timetableId}/entries/move`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entry_ids: entriesToMove.map((e) => e.id),
              target_slot_ids: targetSlots,
              swap_with_entry_ids: targetEntries.map((e) => e.id),
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to swap entries');
        }

        console.log('Swap persisted to backend');

        // Add to history
        addToHistory({
          movedEntries: entriesToMove.map((entry, i) => ({
            entryId: entry.id,
            fromSlotId: currentSlots[i],
            toSlotId: targetSlots[i],
          })),
          swappedEntries: targetEntries.map((entry, i) => ({
            entryId: entry.id,
            fromSlotId: targetSlots[i],
            toSlotId: currentSlots[i],
          })),
        });
      } catch (error) {
        console.error('Error persisting swap:', error);
        alert('Failed to save changes. Please reload the page.');
        // Revert changes on error
        await loadTimetableData();
      }
    } else {
      // MOVE MODE (target is empty) - optimistic update
      setEntries((prev) =>
        prev.map((entry) => {
          const sourceIndex = entriesToMove.findIndex((e) => e.id === entry.id);
          if (sourceIndex !== -1) {
            return { ...entry, time_slot_id: targetSlots[sourceIndex] };
          }
          return entry;
        })
      );

      console.log('Moved entries to empty slots');

      // Call backend API to persist move
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/timetables/${timetableId}/entries/move`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entry_ids: entriesToMove.map((e) => e.id),
              target_slot_ids: targetSlots,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to move entries');
        }

        console.log('Move persisted to backend');

        // Add to history
        addToHistory({
          movedEntries: entriesToMove.map((entry, i) => ({
            entryId: entry.id,
            fromSlotId: currentSlots[i],
            toSlotId: targetSlots[i],
          })),
        });
      } catch (error) {
        console.error('Error persisting move:', error);
        alert('Failed to save changes. Please reload the page.');
        // Revert changes on error
        await loadTimetableData();
      }
    }
  };

  // Get unique periods
  const periods = Array.from(
    new Set(timeSlots.map((slot) => slot.period_number))
  ).sort((a, b) => a - b);

  // Get time slot for specific day and period
  const getTimeSlot = (day: string, period: number) => {
    return timeSlots.find(
      (slot) =>
        slot.day_of_week.toLowerCase() === day.toLowerCase() &&
        slot.period_number === period
    );
  };

  // Get all entries for a time slot (can be multiple for group lessons)
  const getEntries = (timeSlotId: string) => {
    let filteredEntries = entries.filter((entry) => entry.time_slot_id === timeSlotId);

    // Apply class/teacher filter if provided
    if (filterType && filterEntityId) {
      if (filterType === 'class') {
        // Show only entries for the selected class
        filteredEntries = filteredEntries.filter((entry) => entry.class_id === filterEntityId);
      } else if (filterType === 'teacher') {
        // Show only entries for the selected teacher
        filteredEntries = filteredEntries.filter((entry) => entry.teacher_id === filterEntityId);
      }
    }

    return filteredEntries;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading timetable...</div>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No timetable data available</p>
          <p className="text-sm text-gray-400">
            Please configure time slots and generate the timetable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>With Teacher</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-dashed border-orange-400 rounded"></div>
            <span>⚠️ Unassigned</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔒</span>
            <span>Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
            <span>✓ Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-400 rounded"></div>
            <span>⇄ Can Swap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
            <span>✗ Conflict</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1 border-r pr-3 mr-3">
            <button
              onClick={handleUndo}
              disabled={historyIndex < 0}
              className="p-2 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Geri Al (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= moveHistory.length - 1}
              className="p-2 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Yinele (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={movingWithConsecutive}
              onChange={(e) => setMovingWithConsecutive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Move consecutive slots together
            </span>
          </label>
          <div className="text-xs text-gray-500 italic">
            Drag to move/swap • Group lessons move together
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">
                  Time / Day
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const firstSlot = timeSlots.find((s) => s.period_number === period);
                return (
                  <tr key={period}>
                    <td className="border border-gray-300 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                      <div>{firstSlot?.label || `Period ${period}`}</div>
                      {firstSlot && (
                        <div className="text-xs text-gray-500">
                          {firstSlot.start_time} - {firstSlot.end_time}
                        </div>
                      )}
                    </td>
                    {DAYS.map((day) => {
                      const slot = getTimeSlot(day, period);
                      if (!slot) {
                        return (
                          <td
                            key={day}
                            className="border border-gray-300 px-2 py-2 bg-gray-50"
                          />
                        );
                      }

                      if (slot.is_break) {
                        return (
                          <td
                            key={day}
                            className="border border-gray-300 px-2 py-2 bg-yellow-50 text-center"
                          >
                            <span className="text-sm text-yellow-800 font-medium">
                              Break
                            </span>
                          </td>
                        );
                      }

                      const slotEntries = getEntries(slot.id);

                      // Check if this slot is available or has conflict when dragging
                      let isAvailable = false;
                      let hasCellConflict = false;
                      let canSwap = false;

                      if (activeEntry) {
                        // Get all entries that would be moved
                        let entriesToMove: TimetableEntry[] = [];

                        if (selectedEntryIds.length > 0 && selectedEntryIds.includes(activeEntry.id)) {
                          entriesToMove = entries.filter((e) => selectedEntryIds.includes(e.id));
                        } else {
                          const groupEntries = findGroupLessonEntries(activeEntry);
                          if (movingWithConsecutive) {
                            const allEntries = new Set<TimetableEntry>();
                            groupEntries.forEach((groupEntry) => {
                              const consecutive = findConsecutiveSlots(groupEntry);
                              consecutive.forEach((e) => allEntries.add(e));
                            });
                            entriesToMove = Array.from(allEntries);
                          } else {
                            entriesToMove = groupEntries;
                          }
                        }

                        // Check if current slot is one of the source slots
                        const isSourceSlot = entriesToMove.some(e => e.time_slot_id === slot.id);

                        if (!isSourceSlot) {
                          // Calculate if this would be a valid target
                          const targetSlot = timeSlots.find((s) => s.id === slot.id);
                          if (targetSlot) {
                            // Check for the first entry in the move
                            const conflictCheck = hasConflict(entriesToMove[0], slot.id);

                            if (!conflictCheck.hasConflict && slotEntries.length === 0) {
                              // Empty slot with no conflict
                              isAvailable = true;
                            } else if (conflictCheck.hasConflict) {
                              // Has conflict
                              hasCellConflict = true;
                            } else if (slotEntries.length > 0 && !conflictCheck.hasConflict) {
                              // Slot has entries but no conflict - check if we can swap
                              // Get the original slots of the entries being moved
                              const originalSlotIds = entriesToMove.map(e => e.time_slot_id);
                              const uniqueOriginalSlots = [...new Set(originalSlotIds)];

                              // Check if entries in target slot can be moved to source slots
                              let allCanSwap = true;
                              for (const targetEntry of slotEntries) {
                                // Check if each target entry can move to at least one of the source slots
                                const canMoveToAnySource = uniqueOriginalSlots.some(sourceSlotId => {
                                  const reverseConflict = hasConflict(targetEntry, sourceSlotId);
                                  return !reverseConflict.hasConflict;
                                });

                                if (!canMoveToAnySource) {
                                  allCanSwap = false;
                                  break;
                                }
                              }

                              if (allCanSwap) {
                                canSwap = true;
                              }
                            }
                          }
                        }
                      }

                      return (
                        <DroppableCell
                          key={day}
                          slotId={slot.id}
                          entries={slotEntries}
                          consecutiveEntryIds={consecutiveEntryIds}
                          selectedEntryIds={selectedEntryIds}
                          onSelectEntry={handleSelectEntry}
                          isDragging={!!activeEntry}
                          isAvailable={isAvailable}
                          hasConflict={hasCellConflict}
                          canSwap={canSwap}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DragOverlay>
          {activeEntry ? (
            <div
              className="p-2 rounded shadow-2xl border-2 border-blue-500 bg-white"
              style={{ width: '150px' }}
            >
              <div className="text-xs space-y-1">
                <div
                  className="font-semibold"
                  style={{ color: activeEntry.lesson.subject.color_code || '#3B82F6' }}
                >
                  {activeEntry.lesson.subject.short_code}
                </div>
                <div className="text-gray-700">
                  {activeEntry.lesson.teacher
                    ? activeEntry.lesson.teacher.short_name ||
                      `${activeEntry.lesson.teacher.first_name.charAt(0)}. ${activeEntry.lesson.teacher.last_name}`
                    : 'Unassigned'}
                </div>
                <div className="text-gray-500">{activeEntry.lesson.class.name}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
