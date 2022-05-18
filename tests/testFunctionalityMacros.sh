TEST_COUNTER=1
echo ""> testDiffs
for FILE in cpp_test_files/*.in; do
	TEST_NAME=${FILE%.*};
	TEST_NAME=${TEST_NAME:15};
	echo '['$TEST_COUNTER']' $TEST_NAME;
	TEST_COUNTER=$((TEST_COUNTER+1))
	node ../src/script.js < $FILE > temp
	diff --strip-trailing-cr temp ${FILE%.*}.out >> testDiffs
	res=`echo $?`
	if ! [ $res -eq 0 ]; then
		echo '    'FAILED;
	else
		echo '    'SUCCEEDED;
	fi
done
rm temp
