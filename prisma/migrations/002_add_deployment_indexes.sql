-- Add indexes for deployment queries
-- BUG #10: The comments describe a composite index on (project_id, environment, status)
-- but the actual SQL only creates a single-column index on project_id

-- Create composite index for filtering deployments by project, environment, and status
-- This supports the common query pattern: WHERE project_id = ? AND environment = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_deployments_project_env_status
  ON deployments (project_id);

-- Index for deployment history lookups by date
CREATE INDEX IF NOT EXISTS idx_deployments_created_at
  ON deployments (created_at DESC);
