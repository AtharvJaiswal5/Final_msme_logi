-- Check existing users and their emails

SELECT 'Buyer' as role, id, name, email, phone, password FROM buyers 
WHERE id = '96d6f8b0-c504-40f6-8a31-b0b160fb7a4e'
UNION ALL
SELECT 'Seller' as role, id, name, email, phone, password FROM sellers 
WHERE id = 'c319182e-b86a-4a13-b2e2-1c01a8f64f54'
UNION ALL
SELECT 'Driver' as role, id, name, email, phone, password FROM drivers 
WHERE id = 'eaed5bc9-c85d-4bb6-9c76-f8f1db6e67eb';
