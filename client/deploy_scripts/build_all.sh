#!/bin/bash
set -e # will exit if any command has non-zero exit value 
[ -e $BUILD_DIR/InfoBase ] && rm -r $BUILD_DIR/InfoBase # clean up build dir

npm run IB_base

scratch=$(mktemp -d -t build_all_logs.XXXXXXXXXX)

npm run IB_prod_no_watch > $scratch/ib_prod_build_output &
ib_prod_pid=$!

npm run a11y_prod_no_watch > $scratch/a11y_prod_build_output &
a11y_prod_pid=$!

wait $ib_prod_pid
cat $scratch/ib_prod_build_output

wait $a11y_prod_pid
cat $scratch/a11y_prod_build_output