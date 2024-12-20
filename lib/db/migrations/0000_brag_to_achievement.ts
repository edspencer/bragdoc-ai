import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';

export async function up(db: any) {
  await db.run(sql`
    -- Rename the table
    ALTER TABLE "Brag" RENAME TO "Achievement";
    
    -- Update foreign key constraints
    ALTER TABLE "GitHubPullRequest" 
    RENAME COLUMN brag_id TO achievement_id;
  `);
}

export async function down(db: any) {
  await db.run(sql`
    -- Revert the table rename
    ALTER TABLE "Achievement" RENAME TO "Brag";
    
    -- Revert foreign key constraint changes
    ALTER TABLE "GitHubPullRequest"
    RENAME COLUMN achievement_id TO brag_id;
  `);
}
