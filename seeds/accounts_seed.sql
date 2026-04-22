--note you will never be able to log in as these accounts
INSERT INTO accounts (email, password, name, role) VALUES
('account1@example.com', 'hashed_password?', 'Example User', 'user');

--you can (probably) log in as this account
--account: a@a.com
--password: password
INSERT INTO accounts (email, password, name, role) VALUES
('a@a.com', '$2b$12$dZM7ZECvocN5.RR7HjlPp.BGACcc2Rlh81EIVBNdg7It6sNMRSZOe', 'a user', 'user');
