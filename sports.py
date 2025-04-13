import streamlit as st
import os
import glob

st.title("Activity Visualizer")

# Load file list
activity_files = glob.glob("activities/*.[gf][ip][tx]")  # matches .gpx and .fit
activity_choices = [os.path.basename(f) for f in activity_files]

selected_file = st.selectbox("Choose an activity file", activity_choices)