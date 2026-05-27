The registration link currently only collects name, email, and phone, saving to a generic `applications` table. I will update it to be a comprehensive multi-step form that collects all information required for the Jovem Aprendiz program, saving to the specialized `young_applications` table.

### Technical Details
- **Schema Update**: Transition from `applications` to `young_applications` table.
- **Form Structure**: 6-step wizard using `react-hook-form` and `zod`.
  - **Step 1 (Personal)**: Full name, birth date, email, phone, whatsapp.
  - **Step 2 (Address)**: Address, city, state.
  - **Step 3 (Context)**: Education level, study/work status, family income.
  - **Step 4 (Profile)**: Personal story, dreams, motivation (Why MTX), perceived skills, interest area.
  - **Step 5 (Infrastructure)**: Hardware access (laptop, phone, internet) and how they found us.
  - **Step 6 (Legal)**: Data and guardian authorization.
- **UI/UX**: Responsive sectioned layout with progress indicators.
- **Validation**: Strict validation for required fields and formats (email, phone, dates).

### Plan
1. Update `src/routes/inscricao.tsx` to include the expanded Zod schema for `young_applications`.
2. Implement the multi-step form UI with progress tracking.
3. Update the mutation to insert data into `young_applications`.
4. Add field-specific icons and clear labels to improve completion rates.
