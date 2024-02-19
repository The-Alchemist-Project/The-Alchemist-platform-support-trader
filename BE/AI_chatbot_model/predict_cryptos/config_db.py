import MySQLdb as mysql


config = {
  "user": "root",
  "password": "12345678",
  "host": "localhost",
  "database": "dioxtfeq_db"
}


def config_db():
    return mysql.connect(**config)