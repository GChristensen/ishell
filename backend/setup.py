from setuptools import setup, find_packages

setup(
    name='ishell_backend',
    version='0.1',
    packages=['ishell'],
    url='',
    license='',
    author='gchristnsn',
    author_email='gchristnsn@gmail.com',
    description='',
    install_requires=['Flask'],
    entry_points = {
        'console_scripts': ['ishell_backend=ishell.backend:main'],
    }
)
