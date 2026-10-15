-- Ejecuta TODO este script en Supabase → SQL Editor → New query → Run
create table subjects(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),name text not null,created_at timestamptz default now());
create table pdf_documents(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),subject_id uuid references subjects(id) on delete set null,title text not null,parsed_text text,extracted_structure jsonb,created_at timestamptz default now());
create table question_bank(id uuid primary key default gen_random_uuid(),pdf_id uuid not null references pdf_documents(id) on delete cascade,difficulty_level text not null default 'base',question_text text not null,correct_answer text not null,options jsonb,is_custom_ia boolean default false,created_at timestamptz default now());
create table quiz_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),pdf_id uuid references pdf_documents(id) on delete set null,pdf_title text,difficulty text not null,total_questions int not null,score_average numeric(4,2),time_spent_seconds int,xp_earned int default 0,proctoring_strikes int default 0,verdict_report jsonb,completed_at timestamptz default now());
create table review_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),question text not null,answer text not null,due timestamptz not null,step int default 0);
create table user_profile(user_id uuid primary key references auth.users(id) on delete cascade,total_xp int default 0,current_streak int default 0,last_study_date date,gemini_key text);

alter table subjects enable row level security;alter table pdf_documents enable row level security;alter table question_bank enable row level security;
alter table quiz_sessions enable row level security;alter table review_items enable row level security;alter table user_profile enable row level security;

create policy own_subjects on subjects for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_pdfs on pdf_documents for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_sessions on quiz_sessions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_reviews on review_items for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_profile on user_profile for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_questions on question_bank for all
  using(exists(select 1 from pdf_documents d where d.id=pdf_id and d.user_id=auth.uid()))
  with check(exists(select 1 from pdf_documents d where d.id=pdf_id and d.user_id=auth.uid()));

-- Al registrarse: crea perfil y la materia "General"
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into user_profile(user_id) values(new.id); insert into subjects(user_id,name) values(new.id,'General'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
