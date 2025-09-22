-- Custom SQL migration file, put your code below! --

-- Seed initial global data for the Coiffeur responses
INSERT INTO `automatic_responses` (`guild_id`, `configuration`, `probability`) VALUES
(NULL, '{"triggers":["pourquoi","pourkoi","pourkwa","pour quoi","pour koi","pour kwa"],"responses":["Pour feur!","Pour feur.","Pour feur?","Pour feur...","Parce que feur!","Parce que feur.","Parce que feur?","Parce que feur..."]}', 33),
(NULL, '{"triggers":["quoi","koi","kwa"],"responses":["feur","feur!","feur.","feur?","feur...","coubeh","coubeh!","coubeh.","coubeh?","coubeh..."]}', 33);
