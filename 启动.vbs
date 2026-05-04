Set ws = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
dir = fs.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = dir

logFile = dir & "\启动日志.txt"
ret = ws.Run("cmd /c ""启动.bat > """ & logFile & """ 2>&1""", 0, True)

If ret <> 0 Then
    If fs.FileExists(logFile) Then
        Set f = fs.OpenTextFile(logFile, 1)
        log = f.ReadAll()
        f.Close
        If Len(log) > 500 Then log = Right(log, 500)
    Else
        log = "无法读取日志"
    End If
    ws.Popup "启动失败 (错误码: " & ret & ")" & vbCrLf & vbCrLf & log, 20, "PC迁移助手", 48
Else
    If fs.FileExists(logFile) Then fs.DeleteFile logFile
End If
