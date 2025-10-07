-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.programming_language AS ENUM ('python', 'c', 'java');
CREATE TYPE public.contest_status AS ENUM ('scheduled', 'active', 'paused', 'completed');
CREATE TYPE public.submission_status AS ENUM ('pending', 'correct', 'incorrect', 'error');

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language programming_language NOT NULL,
    difficulty difficulty_level NOT NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    hint TEXT,
    faulty_code TEXT NOT NULL,
    correct_code TEXT NOT NULL,
    test_cases JSONB NOT NULL,
    points INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID
);

-- Contests table
CREATE TABLE public.contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status contest_status DEFAULT 'scheduled',
    allowed_languages programming_language[] DEFAULT '{python,c,java}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID
);

-- Participants table
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    selected_language programming_language,
    score INTEGER DEFAULT 0,
    time_taken_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_blocked BOOLEAN DEFAULT false,
    tab_switches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (contest_id, user_id)
);

-- Submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    status submission_status DEFAULT 'pending',
    execution_output TEXT,
    points_awarded INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sent_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contest settings table
CREATE TABLE public.contest_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE UNIQUE,
    auto_save_enabled BOOLEAN DEFAULT true,
    anti_cheat_enabled BOOLEAN DEFAULT true,
    track_tab_switches BOOLEAN DEFAULT true,
    max_attempts_per_question INTEGER DEFAULT 999,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for questions
CREATE POLICY "Anyone can view enabled questions"
ON public.questions FOR SELECT
USING (enabled = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can manage questions"
ON public.questions FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- RLS Policies for contests
CREATE POLICY "Anyone can view active contests"
ON public.contests FOR SELECT
USING (status = 'active' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage contests"
ON public.contests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for participants
CREATE POLICY "Users can view their own participation"
ON public.participants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own participation"
ON public.participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all participants"
ON public.participants FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage participants"
ON public.participants FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for submissions
CREATE POLICY "Users can view their own submissions"
ON public.submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.id = submissions.participant_id
    AND participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own submissions"
ON public.submissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.id = participant_id
    AND participants.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all submissions"
ON public.submissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- RLS Policies for announcements
CREATE POLICY "Users can view announcements for their contests"
ON public.announcements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.contest_id = announcements.contest_id
    AND participants.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- RLS Policies for contest_settings
CREATE POLICY "Admins can view contest settings"
ON public.contest_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contest settings"
ON public.contest_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON public.contests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contest_settings_updated_at BEFORE UPDATE ON public.contest_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();