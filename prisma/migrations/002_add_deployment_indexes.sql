-- Add indexes for deployment queries

-- Create composite index for filtering deployments by project, environment, and status
-- This supports the common query pattern: WHERE project_id = ? AND environment = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_deployments_project_env_status
  ON deployments (project_id);

-- Index for deployment history lookups by date
CREATE INDEX IF NOT EXISTS idx_deployments_created_at
  ON deployments (created_at DESC);
