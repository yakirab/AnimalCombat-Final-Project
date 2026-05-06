# This script creates one big text file that contains the text from many project files.
# It is useful when you want to send or inspect the whole project as one combined dump.

# Store the output filename in a variable so it can be reused below.
$out = "FULL_PROJECT_TEXT_DUMP.txt"

# If an older dump already exists, delete it first so the new dump starts clean.
# -Force lets PowerShell remove the file even if it is read-only.
if (Test-Path $out) { Remove-Item $out -Force }

# List files that should NOT be included in the dump.
# The dump file itself is skipped to avoid copying the old dump into the new dump.
# This script is skipped because including it usually is not useful inside the generated dump.
# test_dump.txt is skipped because it is temporary output.
$skip = @("FULL_PROJECT_TEXT_DUMP.txt", "_make_dump.ps1", "test_dump.txt")

# List file extensions that should be treated as binary or generated output.
# These files are skipped because putting image/audio/build content in a text dump is noisy.
$binaryExtensions = @(
  ".png", ".jpg", ".jpeg", ".gif", ".ico",
  ".mp3", ".wav",
  ".map"
)

# Ask ripgrep (`rg`) to list project files.
# --files means "print file names" instead of searching inside files.
# --hidden includes hidden files, except the .git folder excluded by the -g rule.
# -g "!.git/**" excludes Git internals because those files are not source code.
# Where-Object removes anything listed in $skip.
# Where-Object also removes files whose extension appears in $binaryExtensions.
# Sort-Object makes the output stable and easier to compare between runs.
$files = rg --files --hidden -g "!.git/**" |
  Where-Object { $skip -notcontains $_ } |
  Where-Object { $binaryExtensions -notcontains [System.IO.Path]::GetExtension($_).ToLowerInvariant() } |
  Sort-Object

# Go through each file path found by ripgrep.
foreach ($f in $files) {
  # Add a clear header so the dump shows where this file begins.
  Add-Content -Path $out -Value ("===== FILE: " + $f + " =====")

  # Add a blank line after the header for readability.
  Add-Content -Path $out -Value ""

  # Read the entire file as one string and append it to the dump.
  # -Raw keeps the file content together instead of returning one line at a time.
  # -LiteralPath treats special characters in filenames as normal characters.
  Get-Content -Raw -LiteralPath $f | Add-Content -Path $out

  # Add a blank line after the file content.
  Add-Content -Path $out -Value ""

  # Add a matching footer so the dump shows where this file ends.
  Add-Content -Path $out -Value ("===== END FILE: " + $f + " =====")

  # Add two blank lines between files so separate files are easy to see.
  Add-Content -Path $out -Value ""
  Add-Content -Path $out -Value ""
}

# Print the number of files that were included in the dump.
Write-Output ("COUNT=" + $files.Count)

# Print the final dump file's full path and size in bytes.
Get-Item $out | Select-Object FullName, Length
