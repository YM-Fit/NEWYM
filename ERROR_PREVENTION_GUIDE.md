# Error Prevention Guide

## Overview
This document explains the root causes of recent errors and how to prevent them in the future.

## Recent Errors and Root Causes

### 1. ❌ TrendingUpIcon Undefined Error

**Error**: `ReferenceError: TrendingUpIcon is not defined`

**Root Cause**:
- Import statement had `TrendingDown as TrendingDownIcon` but no alias for `TrendingUp`
- Code used `TrendingUpIcon` which wasn't imported

**Solution**:
- ✅ Always use consistent icon imports
- ✅ Use the centralized `iconImports.ts` file
- ✅ If using aliases, ensure all aliases are defined

**Prevention**:
```typescript
// ❌ BAD - Inconsistent imports
import { TrendingUp, TrendingDown as TrendingDownIcon } from 'lucide-react';
<TrendingUpIcon /> // Error!

// ✅ GOOD - Use centralized imports
import { TrendingUpIcon } from '../utils/iconImports';
<TrendingUpIcon />
```

---

### 2. ❌ weight_kg vs weight Field Name Confusion

**Error**: `400 Bad Request` when querying measurements table

**Root Cause**:
- `measurements` table uses field name `weight`
- `trainee_self_weights` table uses field name `weight_kg`
- Code incorrectly used `weight_kg` for both tables

**Database Schema**:
```sql
-- measurements table
CREATE TABLE measurements (
  weight numeric,  -- NOT weight_kg!
  ...
);

-- trainee_self_weights table
CREATE TABLE trainee_self_weights (
  weight_kg numeric,  -- Different field name!
  ...
);
```

**Solution**:
- ✅ Use `databaseFields.ts` constants for field names
- ✅ Use helper functions from `supabaseQueries.ts`
- ✅ Always verify field names match the actual database schema

**Prevention**:
```typescript
// ❌ BAD - Hardcoded field names, easy to make mistakes
const { data } = await supabase
  .from('measurements')
  .select('weight_kg, measurement_date') // Wrong! Should be 'weight'

// ✅ GOOD - Use constants
import { MEASUREMENT_FIELDS } from '../utils/databaseFields';
const { data } = await supabase
  .from('measurements')
  .select(`${MEASUREMENT_FIELDS.WEIGHT}, ${MEASUREMENT_FIELDS.MEASUREMENT_DATE}`)

// ✅ BETTER - Use helper functions
import { getMeasurements } from '../utils/supabaseQueries';
const measurements = await getMeasurements(supabase, traineeId);
```

---

### 3. ❌ Incorrect Workout Query Syntax

**Error**: `400 Bad Request` when querying workouts with trainee filter

**Root Cause**:
- Attempted to query `workouts` table with filter on `workout_trainees.trainee_id`
- Supabase doesn't support filtering on related tables this way
- Must query from `workout_trainees` and join to `workouts`

**Solution**:
- ✅ Always query from the junction table (`workout_trainees`) when filtering by trainee
- ✅ Use `workouts!inner` syntax for required joins
- ✅ Use helper functions from `supabaseQueries.ts`

**Prevention**:
```typescript
// ❌ BAD - Can't filter workouts by trainee_id directly
const { data } = await supabase
  .from('workouts')
  .select('*')
  .eq('workout_trainees.trainee_id', traineeId) // Error!

// ✅ GOOD - Query from junction table
const { data } = await supabase
  .from('workout_trainees')
  .select(`
    workouts!inner (
      id,
      workout_date,
      ...
    )
  `)
  .eq('trainee_id', traineeId)

// ✅ BETTER - Use helper function
import { getTraineeWorkouts } from '../utils/supabaseQueries';
const workouts = await getTraineeWorkouts(supabase, traineeId);
```

---

## Prevention Strategies

### 1. Type Safety
- ✅ Use TypeScript types from `database.ts`
- ✅ Enable strict mode in TypeScript
- ✅ Use type guards for runtime validation

### 2. Centralized Constants
- ✅ Use `databaseFields.ts` for all field names
- ✅ Use `iconImports.ts` for all icon imports
- ✅ Never hardcode field names or imports

### 3. Helper Functions
- ✅ Use `supabaseQueries.ts` for common query patterns
- ✅ Don't write raw Supabase queries unless necessary
- ✅ Test helper functions thoroughly

### 4. Code Review Checklist
Before merging code that queries the database:
- [ ] Are field names using constants from `databaseFields.ts`?
- [ ] Are queries using helper functions when available?
- [ ] Are icon imports using `iconImports.ts`?
- [ ] Have you verified field names match the database schema?
- [ ] Are you querying from the correct table (junction tables for filters)?

### 5. Testing
- ✅ Write unit tests for helper functions
- ✅ Test queries with actual data
- ✅ Use TypeScript to catch type errors at compile time

### 6. Documentation
- ✅ Document field name differences (e.g., `weight` vs `weight_kg`)
- ✅ Document query patterns in code comments
- ✅ Keep this guide updated with new patterns

---

## Common Patterns

### Querying Measurements
```typescript
import { getMeasurements } from '../utils/supabaseQueries';

const measurements = await getMeasurements(supabase, traineeId, {
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  limit: 50,
});
```

### Querying Self Weights
```typescript
import { getSelfWeights } from '../utils/supabaseQueries';

const selfWeights = await getSelfWeights(supabase, traineeId, {
  limit: 10,
});
```

### Querying Trainee Workouts
```typescript
import { getTraineeWorkouts } from '../utils/supabaseQueries';

const workouts = await getTraineeWorkouts(supabase, traineeId, {
  completed: true,
  startDate: '2025-01-01',
  endDate: '2025-01-31',
});
```

### Combining Weight Data
```typescript
import { getCombinedWeights } from '../utils/supabaseQueries';

const allWeights = await getCombinedWeights(supabase, traineeId, {
  startDate: '2025-01-01',
  endDate: '2025-01-31',
});
```

---

## Migration Checklist

When adding new database fields or tables:
1. ✅ Update `databaseFields.ts` with new constants
2. ✅ Update `database.ts` types
3. ✅ Create helper functions in `supabaseQueries.ts` if needed
4. ✅ Update this guide with new patterns
5. ✅ Test thoroughly before merging

---

## Questions?

If you're unsure about:
- Which field name to use → Check `databaseFields.ts`
- How to structure a query → Check `supabaseQueries.ts` for examples
- Which table to query from → Check the database schema or this guide
