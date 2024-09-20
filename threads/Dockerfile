FROM quay.io/jupyter/datascience-notebook:notebook-7.2.2

ADD *.py /home/jovyan/
ADD *.ipynb /home/jovyan/

USER root
RUN chown jovyan:users /home/jovyan/*

USER jovyan
RUN conda install -c conda-forge -y conda-libmamba-solver && conda config --set solver libmamba
RUN conda install -c microsoft -y playwright --solver=libmamba
RUN playwright install chromium
