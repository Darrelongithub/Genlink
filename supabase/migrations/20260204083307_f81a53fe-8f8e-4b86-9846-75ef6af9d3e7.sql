-- Create enum types for module and exercise types
CREATE TYPE public.module_type AS ENUM ('free', 'premium');
CREATE TYPE public.exercise_type AS ENUM ('simulation', 'drag_drop', 'scenario_game', 'sandbox', 'quiz', 'video');
CREATE TYPE public.badge_type AS ENUM ('completion', 'streak', 'mastery', 'speed', 'explorer');

-- Create modules table (3-5 free modules per course + premium modules)
CREATE TABLE public.modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    module_type module_type NOT NULL DEFAULT 'free',
    order_index INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    estimated_minutes INTEGER NOT NULL DEFAULT 15,
    content JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table for interactive content
CREATE TABLE public.exercises (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    exercise_type exercise_type NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 25,
    content JSONB NOT NULL DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_progress table to track module completion
CREATE TABLE public.user_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, module_id)
);

-- Create exercise_progress table
CREATE TABLE public.exercise_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, exercise_id)
);

-- Create user_xp table for tracking XP and levels
CREATE TABLE public.user_xp (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create achievements table
CREATE TABLE public.achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    badge_type badge_type NOT NULL,
    icon TEXT NOT NULL DEFAULT 'trophy',
    xp_reward INTEGER NOT NULL DEFAULT 100,
    requirement_value INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- Enable RLS on all tables
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Public read policies for courses/modules/exercises/achievements
CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- User-specific policies for progress tracking
CREATE POLICY "Users can view their own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own exercise progress" ON public.exercise_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exercise progress" ON public.exercise_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise progress" ON public.exercise_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own XP" ON public.user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own XP" ON public.user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own XP" ON public.user_xp FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_xp_updated_at
BEFORE UPDATE ON public.user_xp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default achievements
INSERT INTO public.achievements (name, description, badge_type, icon, xp_reward, requirement_value) VALUES
('First Steps', 'Complete your first module', 'completion', 'footprints', 50, 1),
('Quick Learner', 'Complete 5 modules', 'completion', 'zap', 100, 5),
('Knowledge Seeker', 'Complete 10 modules', 'completion', 'book-open', 200, 10),
('Master Scholar', 'Complete 25 modules', 'mastery', 'graduation-cap', 500, 25),
('Streak Starter', 'Learn for 3 days in a row', 'streak', 'flame', 75, 3),
('Week Warrior', 'Learn for 7 days in a row', 'streak', 'fire', 150, 7),
('Month Master', 'Learn for 30 days in a row', 'streak', 'trophy', 500, 30),
('Speed Demon', 'Complete a module in under 5 minutes', 'speed', 'timer', 100, 1),
('Explorer', 'Start courses in 3 different categories', 'explorer', 'compass', 150, 3),
('ICT Pioneer', 'Complete all free ICT modules', 'mastery', 'cpu', 300, 1),
('Finance Guru', 'Complete all free financial modules', 'mastery', 'trending-up', 300, 1),
('Content Creator', 'Complete all free income skills modules', 'mastery', 'video', 300, 1);

-- Insert sample modules for each course (3-5 free modules + premium modules)
-- Mindset Renewal course modules
INSERT INTO public.modules (course_id, title, description, module_type, order_index, xp_reward, estimated_minutes, content) VALUES
('mindset-renewal', 'Introduction to Mindset Renewal', 'Understand the power of mindset in shaping your reality', 'free', 1, 50, 10, '{"type": "video", "videoUrl": null, "description": "Learn the foundations of mindset transformation"}'),
('mindset-renewal', 'Identifying Limiting Beliefs', 'Discover and recognize beliefs holding you back', 'free', 2, 75, 15, '{"type": "simulation", "scenario": "belief-identifier"}'),
('mindset-renewal', 'Reframing Techniques', 'Learn practical methods to reframe negative thoughts', 'free', 3, 75, 20, '{"type": "drag_drop", "exercise": "reframe-match"}'),
('mindset-renewal', 'Building Abundance Consciousness', 'Shift from scarcity to abundance mindset', 'free', 4, 100, 25, '{"type": "scenario_game", "scenario": "abundance-choices"}'),
('mindset-renewal', 'Deep Mindset Transformation', 'Advanced techniques for lasting change', 'premium', 5, 150, 30, '{"type": "advanced", "locked": true}'),

-- Financial Wisdom modules
('financial-wisdom', 'Understanding Money', 'Learn the true nature of money and wealth', 'free', 1, 50, 10, '{"type": "video"}'),
('financial-wisdom', 'Budgeting Basics', 'Create your first personal budget', 'free', 2, 75, 20, '{"type": "simulation", "scenario": "budget-builder"}'),
('financial-wisdom', 'Saving Strategies', 'Effective methods to build your savings', 'free', 3, 75, 15, '{"type": "drag_drop", "exercise": "savings-priority"}'),
('financial-wisdom', 'Investment Introduction', 'Understanding different investment vehicles', 'free', 4, 100, 25, '{"type": "scenario_game", "scenario": "investment-choices"}'),
('financial-wisdom', 'Advanced Wealth Building', 'Comprehensive investment strategies', 'premium', 5, 200, 45, '{"type": "advanced", "locked": true}'),

-- Digital Fluency modules
('digital-fluency', 'Digital World Overview', 'Navigate the modern digital landscape', 'free', 1, 50, 10, '{"type": "video"}'),
('digital-fluency', 'Essential Digital Tools', 'Master productivity apps and software', 'free', 2, 75, 20, '{"type": "simulation", "scenario": "tool-explorer"}'),
('digital-fluency', 'Online Safety Basics', 'Protect yourself online', 'free', 3, 75, 15, '{"type": "drag_drop", "exercise": "security-checklist"}'),
('digital-fluency', 'Cloud Collaboration', 'Work effectively with cloud tools', 'free', 4, 100, 25, '{"type": "sandbox", "environment": "cloud-demo"}'),

-- Forex Trading modules
('forex-trading', 'Forex Market Introduction', 'Understand how currency markets work', 'free', 1, 50, 15, '{"type": "video"}'),
('forex-trading', 'Currency Pairs Basics', 'Learn about major and minor pairs', 'free', 2, 75, 20, '{"type": "simulation", "scenario": "pair-analyzer"}'),
('forex-trading', 'Reading Charts', 'Introduction to technical analysis', 'free', 3, 100, 25, '{"type": "sandbox", "environment": "chart-reader"}'),
('forex-trading', 'Trading Simulator', 'Practice with virtual money', 'free', 4, 150, 30, '{"type": "simulation", "scenario": "trading-sim"}'),
('forex-trading', 'Professional Trading Strategies', 'Advanced trading techniques', 'premium', 5, 300, 60, '{"type": "advanced", "locked": true}'),

-- Content Creation modules
('content-creation', 'Content Creation Fundamentals', 'Understand the content creation landscape', 'free', 1, 50, 10, '{"type": "video"}'),
('content-creation', 'Writing Compelling Copy', 'Learn persuasive writing techniques', 'free', 2, 75, 20, '{"type": "simulation", "scenario": "copywriting-practice"}'),
('content-creation', 'Content Planning', 'Build your content strategy', 'free', 3, 75, 15, '{"type": "drag_drop", "exercise": "content-calendar"}'),
('content-creation', 'eBook Structure', 'Plan your first digital product', 'free', 4, 100, 25, '{"type": "scenario_game", "scenario": "ebook-builder"}'),
('content-creation', 'Monetization Mastery', 'Turn content into income', 'premium', 5, 200, 45, '{"type": "advanced", "locked": true}'),

-- YouTube Monetization modules
('youtube-monetization', 'YouTube Platform Overview', 'Understand the YouTube ecosystem', 'free', 1, 50, 10, '{"type": "video"}'),
('youtube-monetization', 'Channel Setup Essentials', 'Create and optimize your channel', 'free', 2, 75, 20, '{"type": "simulation", "scenario": "channel-setup"}'),
('youtube-monetization', 'Content Strategy', 'Plan videos that grow your audience', 'free', 3, 75, 15, '{"type": "drag_drop", "exercise": "video-planning"}'),
('youtube-monetization', 'Analytics Dashboard', 'Understand your channel metrics', 'free', 4, 100, 25, '{"type": "sandbox", "environment": "analytics-demo"}'),
('youtube-monetization', 'Advanced Monetization', 'Multiple income streams from YouTube', 'premium', 5, 200, 45, '{"type": "advanced", "locked": true}'),

-- Cybersecurity modules
('cybersecurity', 'Cybersecurity Fundamentals', 'Introduction to digital security', 'free', 1, 50, 10, '{"type": "video"}'),
('cybersecurity', 'Password Security', 'Create and manage strong passwords', 'free', 2, 75, 15, '{"type": "simulation", "scenario": "password-strength"}'),
('cybersecurity', 'Phishing Detection', 'Identify and avoid phishing attacks', 'free', 3, 100, 20, '{"type": "scenario_game", "scenario": "phishing-detective"}'),
('cybersecurity', 'Security Audit Lab', 'Practice security assessment', 'free', 4, 150, 30, '{"type": "sandbox", "environment": "security-lab"}'),

-- Cloud Computing modules
('cloud-computing', 'Cloud Computing Basics', 'What is cloud computing?', 'free', 1, 50, 10, '{"type": "video"}'),
('cloud-computing', 'Cloud Service Models', 'IaaS, PaaS, and SaaS explained', 'free', 2, 75, 15, '{"type": "drag_drop", "exercise": "service-model-match"}'),
('cloud-computing', 'Cloud Providers Overview', 'Compare major cloud platforms', 'free', 3, 75, 20, '{"type": "simulation", "scenario": "provider-compare"}'),
('cloud-computing', 'Virtual Server Lab', 'Set up your first cloud instance', 'free', 4, 150, 30, '{"type": "sandbox", "environment": "cloud-console"}'),

-- Python Programming modules
('python-programming', 'Python Environment Setup', 'Install and configure Python', 'free', 1, 50, 15, '{"type": "video"}'),
('python-programming', 'Python Syntax Basics', 'Variables, types, and operations', 'free', 2, 75, 20, '{"type": "sandbox", "environment": "python-editor"}'),
('python-programming', 'Control Flow', 'If statements and loops', 'free', 3, 100, 25, '{"type": "sandbox", "environment": "python-editor"}'),
('python-programming', 'Functions & Modules', 'Write reusable code', 'free', 4, 100, 25, '{"type": "sandbox", "environment": "python-editor"}'),
('python-programming', 'Advanced Python Projects', 'Build real applications', 'premium', 5, 300, 60, '{"type": "advanced", "locked": true}'),

-- Data Science modules
('data-science', 'Data Science Introduction', 'What is data science?', 'free', 1, 50, 10, '{"type": "video"}'),
('data-science', 'Data Types & Structures', 'Understanding data formats', 'free', 2, 75, 20, '{"type": "simulation", "scenario": "data-explorer"}'),
('data-science', 'Basic Statistics', 'Essential statistical concepts', 'free', 3, 100, 25, '{"type": "sandbox", "environment": "stats-calculator"}'),
('data-science', 'Data Visualization', 'Create meaningful charts', 'free', 4, 100, 25, '{"type": "sandbox", "environment": "chart-builder"}'),
('data-science', 'Machine Learning Basics', 'Introduction to ML', 'premium', 5, 300, 60, '{"type": "advanced", "locked": true}'),

-- IoT modules
('iot-basics', 'IoT Fundamentals', 'Understanding connected devices', 'free', 1, 50, 10, '{"type": "video"}'),
('iot-basics', 'Sensors & Actuators', 'How IoT devices sense and act', 'free', 2, 75, 15, '{"type": "drag_drop", "exercise": "sensor-matching"}'),
('iot-basics', 'IoT Communication', 'How devices talk to each other', 'free', 3, 75, 20, '{"type": "simulation", "scenario": "iot-network"}'),
('iot-basics', 'Smart Home Simulator', 'Build a virtual smart home', 'free', 4, 150, 30, '{"type": "sandbox", "environment": "smart-home"}'),

-- AI & ML modules
('ai-ml-basics', 'AI Fundamentals', 'What is artificial intelligence?', 'free', 1, 50, 10, '{"type": "video"}'),
('ai-ml-basics', 'Machine Learning Types', 'Supervised vs unsupervised learning', 'free', 2, 75, 15, '{"type": "drag_drop", "exercise": "ml-type-match"}'),
('ai-ml-basics', 'Neural Network Basics', 'How neural networks work', 'free', 3, 100, 25, '{"type": "simulation", "scenario": "neural-visualizer"}'),
('ai-ml-basics', 'AI Playground', 'Experiment with AI models', 'free', 4, 150, 30, '{"type": "sandbox", "environment": "ai-playground"}'),
('ai-ml-basics', 'Building ML Models', 'Create your own models', 'premium', 5, 300, 60, '{"type": "advanced", "locked": true}');