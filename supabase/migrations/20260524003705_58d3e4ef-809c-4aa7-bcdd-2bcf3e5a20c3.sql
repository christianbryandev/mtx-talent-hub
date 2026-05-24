-- Create applications table
CREATE TABLE public.applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invites table
CREATE TABLE public.invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Policies for applications
CREATE POLICY "Anyone can submit an application" 
ON public.applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can view applications" 
ON public.applications 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Only admins can update applications" 
ON public.applications 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Policies for invites
CREATE POLICY "Only admins can create invites" 
ON public.invites 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Anyone can view an invite by token" 
ON public.invites 
FOR SELECT 
USING (true); -- We will filter by token in the application code as requested

CREATE POLICY "Update invite as used" 
ON public.invites 
FOR UPDATE 
USING (NOT is_used)
WITH CHECK (is_used = true);
