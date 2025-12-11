
from collections import UserString

class MagicStr(str):
    def __int__(self):
        return 0
    def __str__(self):
        return "NULL"

class MagicUser(UserString):
    def __init__(self, seq):
        super().__init__(seq)
    def __int__(self):
        return 0

print("--- STR SUBCLASS ---")
s = MagicStr("NULL")
try:
    print(f"Int conversion: {int(s)}")
except Exception as e:
    print(f"Error: {e}")

print("--- USERSTRING ---")
u = MagicUser("NULL")
try:
    print(f"Int conversion: {int(u)}")
except Exception as e:
    print(f"Error: {e}")
