# This part calculates mean and standard deviation
import numpy as np

print("Welcome to PyGenix, An online Python code Editor")
data = [10, 20, 15, 25, 30, 12, 18, 22]
print("\n--- Data Analysis ---")
print(f"Data points: {data}")
mean_val = np.mean(data)
std_dev = np.std(data)
print(f"Mean: {mean_val:.2f}")
print(f"Standard Deviation: {std_dev:.2f}")
