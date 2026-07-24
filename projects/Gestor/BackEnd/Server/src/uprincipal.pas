unit uPrincipal;

{$mode Delphi}{$H+}

interface

uses
   Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls, StdCtrls,
   EditBtn, FileUtil, fpjson, jsonparser,
   uBase.Functions, uConfig;

type
  TfrmPrincipal = class;
  TLogRefreshThread = class(TThread)
  private
    FOwner: TfrmPrincipal;
  protected
    procedure Execute; override;
    procedure SyncCarregarLogs;
  public
    constructor Create(AOwner: TfrmPrincipal);
  end;

	{ TfrmPrincipal }

  TfrmPrincipal = class(TForm)
    btRefresh: TButton;
    btConfig: TButton;
    DateTimePicker1: TDateEdit;
    DateTimePicker2: TDateEdit;
    Label1: TLabel;
    Label2: TLabel;
    lbServer_Port_Ativa: TLabel;
    TreeView_Log: TMemo;
    pnHeader: TPanel;
    pnFilter: TPanel;
    pnBody: TPanel;
    pnFooter: TPanel;
		procedure FormClose(Sender: TObject; var CloseAction: TCloseAction);
    procedure FormCreate(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure btRefreshClick(Sender: TObject);
    procedure btConfigClick(Sender: TObject);
    procedure DateTimePickerChange(Sender: TObject);
  private
    FThreadLog: TLogRefreshThread;
    procedure CarregarLogs;
  end;

var
  frmPrincipal: TfrmPrincipal;

implementation

{$R *.lfm}

constructor TLogRefreshThread.Create(AOwner: TfrmPrincipal);
begin
    inherited Create(True);
  FOwner := AOwner;
  FreeOnTerminate := False;
end;

procedure TLogRefreshThread.SyncCarregarLogs;
begin
  if Assigned(FOwner) then
    FOwner.CarregarLogs;
end;

procedure TLogRefreshThread.Execute;
begin
  while not Terminated do
  begin
    Sleep(60000);
    if not Terminated then
      TThread.Synchronize(nil, SyncCarregarLogs);
  end;
end;

procedure TfrmPrincipal.CarregarLogs;
var
  LArquivos: TStringList;
  LArquivo: string;
  LConteudo: string;
  LJsonValue: TJSONData;
  LJsonArray: TJSONArray;
  I, J, A: Integer;
  LObjDia: TJSONObject;
  LDataStr: string;
  LData, LDataIni, LDataFim: TDateTime;
  LLogsArray: TJSONArray;
  LLogObj: TJSONObject;

  procedure AddField(var ANode: string; const AKey, AVal: string);
  begin
    if Trim(AVal) <> '' then
      TreeView_Log.Lines.Add(ANode + '  ' + AKey + ': ' + AVal);
  end;

begin
  LDataIni := Trunc(DateTimePicker1.Date);
  LDataFim := Trunc(DateTimePicker2.Date);
  if LDataIni > LDataFim then
    LDataFim := LDataIni;

  TreeView_Log.Lines.BeginUpdate;
  try
    TreeView_Log.Lines.Clear;

    LArquivos := FindAllFiles(EndPath, NameEXE + '*_Log.json', False);
    LArquivos.Sort;

    for A := LArquivos.Count - 1 downto 0 do
    begin
      LArquivo := LArquivos[A];
      try
        with TStringList.Create do
      try
        LoadFromFile(LArquivo);
        LConteudo := Text;
      finally
        Free;
      end;
      except
        Continue;
      end;
      if Trim(LConteudo) = '' then
        Continue;

      LJsonValue := ParseJSONValue(LConteudo);
      if not (LJsonValue is TJSONArray) then
      begin
        LJsonValue.Free;
        Continue;
      end;

      LJsonArray := LJsonValue as TJSONArray;
      try
        for I := LJsonArray.Count - 1 downto 0 do
        begin
          if not (LJsonArray.Items[I] is TJSONObject) then
            Continue;

          LObjDia := LJsonArray.Items[I] as TJSONObject;
          LDataStr := LObjDia.GetValue('date', '');
          if LDataStr = '' then
            Continue;

          if not TryParseIsoDate(LDataStr, LData) then
            Continue;

          if (LData < LDataIni) or (LData > LDataFim) then
            Continue;

          TreeView_Log.Lines.Add(LDataStr);
          TreeView_Log.Lines.Add('  product_name: ' + LObjDia.GetValue('product_name', ''));
          TreeView_Log.Lines.Add('  version: ' + LObjDia.GetValue('version', ''));
          TreeView_Log.Lines.Add('  usuario_pc: ' + LObjDia.GetValue('usuario_pc', ''));
          TreeView_Log.Lines.Add('  logs:');

          LLogsArray := LObjDia.Get('logs', TJSONArray(nil));
          if Assigned(LLogsArray) then
          begin
            for J := LLogsArray.Count - 1 downto 0 do
            begin
              if not (LLogsArray.Items[J] is TJSONObject) then
                Continue;

              LLogObj := LLogsArray.Items[J] as TJSONObject;

              TreeView_Log.Lines.Add('    ' + LLogObj.GetValue('time', ''));
              TreeView_Log.Lines.Add('      type: ' + LLogObj.GetValue('type', ''));
              TreeView_Log.Lines.Add('      level: ' + LLogObj.GetValue('level', ''));
              TreeView_Log.Lines.Add('      form_name: ' + LLogObj.GetValue('form_name', ''));
              TreeView_Log.Lines.Add('      caption_name: ' + LLogObj.GetValue('caption_name', ''));
              TreeView_Log.Lines.Add('      unit: ' + LLogObj.GetValue('unit', ''));
              TreeView_Log.Lines.Add('      user: ' + LLogObj.GetValue('user', ''));
              TreeView_Log.Lines.Add('      sql: ' + LLogObj.GetValue('sql', ''));
              TreeView_Log.Lines.Add('      extra: ' + LLogObj.GetValue('extra', ''));
              TreeView_Log.Lines.Add('      json_in: ' + LLogObj.GetValue('json_in', ''));
              TreeView_Log.Lines.Add('      json_out: ' + LLogObj.GetValue('json_out', ''));
              TreeView_Log.Lines.Add('      exception_class: ' + LLogObj.GetValue('exception_class', ''));
              TreeView_Log.Lines.Add('      exception_description: ' + LLogObj.GetValue('exception_description', ''));
              TreeView_Log.Lines.Add('      message: ' + LLogObj.GetValue('message', ''));
            end;
          end;
        end;
      finally
        LJsonArray.Free;
      end;
    end;
  finally
    TreeView_Log.Lines.EndUpdate;
  end;
end;

procedure TfrmPrincipal.btConfigClick(Sender: TObject);
var
  frm: TfrmConfig;
begin
  frm := TfrmConfig.Create(Self);
  try
    frm.ShowModal;
  finally
    frm.Free;
  end;
end;

procedure TfrmPrincipal.btRefreshClick(Sender: TObject);
begin
  CarregarLogs;
end;

procedure TfrmPrincipal.FormCreate(Sender: TObject);
begin
  FThreadLog := TLogRefreshThread.Create(Self);
  FThreadLog.Start;
end;

procedure TfrmPrincipal.FormClose(Sender: TObject; var CloseAction: TCloseAction
			);
begin
  //Action := TCloseAction.caFree;
end;

procedure TfrmPrincipal.FormDestroy(Sender: TObject);
begin
  if Assigned(FThreadLog) then
  begin
    FThreadLog.Terminate;
    FThreadLog.WaitFor;
    FreeAndNil(FThreadLog);
  end;
end;

procedure TfrmPrincipal.DateTimePickerChange(Sender: TObject);
begin
  CarregarLogs;
end;

procedure TfrmPrincipal.FormShow(Sender: TObject);
begin
  DateTimePicker1.Date := Date;
  DateTimePicker2.Date := Date;
  DateTimePicker1.OnChange := DateTimePickerChange;
  DateTimePicker2.OnChange := DateTimePickerChange;

  CarregarLogs;
end;

end.
