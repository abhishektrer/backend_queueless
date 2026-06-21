@echo off
echo ========================================
echo   PUSHING BACKEND TO GITHUB
echo ========================================

echo.
echo Step 1: Adding files to Git...
git add .

echo.
echo Step 2: Committing changes...
git commit -m "feat: Hybrid JWT + Firebase authentication with AI and notifications"

echo.
echo Step 3: Setting up remote (if needed)...
git remote remove origin 2>nul
git remote add origin https://github.com/abhishektrer/backend_queueless.git

echo.
echo Step 4: Pushing to GitHub...
git branch -M main
git push -u origin main --force

echo.
echo ========================================
echo   BACKEND PUSHED SUCCESSFULLY!
echo ========================================
echo.
echo Verify at: https://github.com/abhishektrer/backend_queueless
pause
