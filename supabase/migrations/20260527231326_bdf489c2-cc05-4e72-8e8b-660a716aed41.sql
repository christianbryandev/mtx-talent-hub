-- Update tasks constraint
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_created_by_fkey,
ADD CONSTRAINT tasks_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update task_comments constraint
ALTER TABLE public.task_comments 
DROP CONSTRAINT IF EXISTS task_comments_author_id_fkey,
ADD CONSTRAINT task_comments_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update task_attachments constraint
ALTER TABLE public.task_attachments 
DROP CONSTRAINT IF EXISTS task_attachments_uploaded_by_fkey,
ADD CONSTRAINT task_attachments_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update notifications constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_created_by_fkey,
ADD CONSTRAINT notifications_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;