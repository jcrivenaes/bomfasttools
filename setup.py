#!/usr/bin/env python3
"""Setup for e39tools packages"""
from glob import glob
from os.path import splitext, basename

import setuptools
from setuptools import find_packages


SSCRIPTS = [
    "bomcalc = e39tools.bomcalc:main",
]

REQUIREMENTS = [
    "pandas",
    "pyyaml",
]

SETUP_REQUIREMENTS = [
    "setuptools >=28",
    "setuptools_scm",
    "pytest-runner",
]

TEST_REQUIREMENTS = [
    "black>=20.8b0",
    "flake8",
    "pytest",
]
DOCS_REQUIREMENTS = [
    "sphinx",
    "sphinx-argparse",
    "sphinx_rtd_theme",
    "autoapi",
]
EXTRAS_REQUIRE = {"tests": TEST_REQUIREMENTS, "docs": DOCS_REQUIREMENTS}

setuptools.setup(
    name="e39tools",
    description="JC mocks E39",
    author="jcr",
    author_email="",
    url="",
    keywords=[],
    license="Not open source (violating TR1621)",
    platforms="any",
    include_package_data=True,
    packages=find_packages("src"),
    package_dir={"": "src"},
    py_modules=[splitext(basename(path))[0] for path in glob("src/*.py")],
    install_requires=REQUIREMENTS,
    setup_requires=SETUP_REQUIREMENTS,
    entry_points={"console_scripts": SSCRIPTS,},
    test_suite="tests",
    extras_require=EXTRAS_REQUIRE,
)
