--note you will never be able to log in as these accounts
INSERT INTO accounts (email, password, name, role) VALUES
('a@a.com', 'hashed_password?', 'Example User', 'user'),

-- you can log into these accounts with password: "password"
('user@example.com', '$2b$12$dZM7ZECvocN5.RR7HjlPp.BGACcc2Rlh81EIVBNdg7It6sNMRSZOe', 'a user', 'user'),
('admin@example.com', '$2b$12$dZM7ZECvocN5.RR7HjlPp.BGACcc2Rlh81EIVBNdg7It6sNMRSZOe', 'admin user', 'admin'),
('owner@example.com', '$2b$12$dZM7ZECvocN5.RR7HjlPp.BGACcc2Rlh81EIVBNdg7It6sNMRSZOe', 'store owner', 'store_owner');
