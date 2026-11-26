-- Campos opcionales: los eventos anteriores conservan sus datos.
ALTER TABLE "InstitutionEvent"
  ADD COLUMN "locationType" TEXT,
  ADD COLUMN "venueName" TEXT,
  ADD COLUMN "venueAddress" TEXT;
