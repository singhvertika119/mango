-- 1. Create HNSW Index for semantic similarity using cosine distance
create index if not exists document_chunks_embedding_hnsw_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- 2. Create Full-Text Search (FTS) GIN Index
create index if not exists document_chunks_fts_idx
  on public.document_chunks
  using gin (to_tsvector('english', content));

-- 3. Create RAG Cosine Matching RPC Stored Procedure
create or replace function public.match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_workspace_id uuid,
  filter_project_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
security definer set search_path = public
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity,
    document_chunks.metadata
  from public.document_chunks
  where document_chunks.workspace_id = filter_workspace_id
    and (filter_project_id is null or document_chunks.project_id = filter_project_id)
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding asc
  limit match_count;
end;
$$;
