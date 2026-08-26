ALTER TABLE event_services
    ADD COLUMN service_name_snapshot VARCHAR(120) NULL;

UPDATE event_services es
JOIN services s ON s.id = es.service_id
SET es.service_name_snapshot = s.name
WHERE es.service_name_snapshot IS NULL;
