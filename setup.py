#!/usr/bin/env python3
"""
Obsidian → Excel Automation System
Automated Excel report generation from Obsidian markdown files
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

with open("requirements.txt", "r", encoding="utf-8") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="obsidian-excel-automation",
    version="1.0.0",
    author="Jamin Park",
    author_email="jamin.park@example.com",
    description="Automated Excel report generation from Obsidian markdown files",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/jaminpark/obsidian-excel-automation",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Office/Business",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "obsidian-excel=obsidian_excel_automation.cli:cli",
        ],
    },
)
