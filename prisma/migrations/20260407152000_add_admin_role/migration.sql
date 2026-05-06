-- Add ADMIN role for platform administration.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
