import multiprocessing

from ishell import backend

if __name__ == "__main__":
    multiprocessing.freeze_support()
    backend.main()

