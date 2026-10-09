-- Publish the matching static cover assets before applying this migration.
-- Change covers only; preserve article text, access rules and client data.
UPDATE articles SET image='mimflo-cover-volume-1-trav-01-v1.webp' WHERE id='volume-1-trav-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-trav-02-v1.webp' WHERE id='volume-1-trav-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-edu-01-v1.webp' WHERE id='volume-1-edu-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-edu-02-v1.webp' WHERE id='volume-1-edu-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-env-01-v1.webp' WHERE id='volume-1-env-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-env-02-v1.webp' WHERE id='volume-1-env-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-tech-01-v1.webp' WHERE id='volume-1-tech-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-tech-02-v1.webp' WHERE id='volume-1-tech-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-net-01-v1.webp' WHERE id='volume-1-net-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-1-net-02-v1.webp' WHERE id='volume-1-net-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-med-01-v1.webp' WHERE id='volume-2-med-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-med-02-v1.webp' WHERE id='volume-2-med-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-imm-01-v1.webp' WHERE id='volume-2-imm-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-imm-02-v1.webp' WHERE id='volume-2-imm-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-fam-01-v1.webp' WHERE id='volume-2-fam-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-fam-02-v1.webp' WHERE id='volume-2-fam-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-soc-01-v1.webp' WHERE id='volume-2-soc-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-soc-02-v1.webp' WHERE id='volume-2-soc-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-cit-01-v1.webp' WHERE id='volume-2-cit-01' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-volume-2-cit-02-v1.webp' WHERE id='volume-2-cit-02' AND image IN ('environment.webp','social.jpeg','city.jpeg');
UPDATE articles SET image='mimflo-cover-park-v1.webp' WHERE id='2d81d5df-557e-47ca-bdf2-9f47b5931f06' AND image IN ('environment.webp','social.jpeg','city.jpeg');
