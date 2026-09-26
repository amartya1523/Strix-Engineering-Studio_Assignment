"""Intentionally flawed sample for reviewing. Never use this in production."""
import sqlite3

def find_user(name):
    connection = sqlite3.connect('app.db')
    query = "SELECT * FROM users WHERE name = '" + name + "'"
    return connection.execute(query).fetchall()

def login(username, password):
    users = find_user(username)
    return bool(users) and password == 'example-only-unsafe-password'
