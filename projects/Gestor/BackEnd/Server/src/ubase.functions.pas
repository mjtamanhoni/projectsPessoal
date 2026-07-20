unit uBase.Functions;

{$mode Delphi}{$H+}

interface

uses
  Classes, SysUtils, fpjson, jsonparser, IniFiles, FileUtil, db, ZDataset;

function LerIni(const ASecao, AChave, AArquivo: string): string;
function ConfigFile: string;
function EndPath: string;
function NameEXE: string;
function TryParseIsoDate(const AData: string; out AResult: TDateTime): Boolean;
function Validar(const ASenha, AHash: string): Boolean;
function Criptografar(const AValor: string): string;
procedure GravarLogJSON(const AUnit, ADescricao, AForm: string; AException: Exception);
function QueryToJSONArray(AQuery: TDataSet): TJSONArray;
function QueryToJSONObject(AQuery: TDataSet): TJSONObject;

type
  TJSONPair = class
  public
    Key: string;
    Value: TJSONData;
    constructor Create(const AKey: string; const AValue: string); overload;
    constructor Create(const AKey: string; AValue: TJSONData); overload;
    destructor Destroy; override;
  end;

  TJSONObjectHelper = class helper for TJSONObject
    function AddPair(const AKey: string; const AValue: TJSONData): TJSONObject; overload;
    function AddPair(const AKey, AValue: string): TJSONObject; overload;
    function GetValue(const AKey: string; const ADefault: string): string; overload;
    function GetValue(const AKey: string; const ADefault: Integer): Integer; overload;
    function GetValue(const AKey: string; const ADefault: Int64): Int64; overload;
    function GetValue(const AKey: string; const ADefault: Double): Double; overload;
    function GetValue(const AKey: string; const ADefault: Boolean): Boolean; overload;
    function GetValue(const AKey: string; const ADefault: TDateTime): TDateTime; overload;
    function GetValue(const AKey: string; const ADefault: TDate): TDate; overload;
  end;

function ParseJSONValue(const S: string): TJSONData;

const
  cLogTipoLogin = 'Login';

implementation

{ TJSONPair }

constructor TJSONPair.Create(const AKey: string; const AValue: string);
begin
  Key := AKey;
  Value := TJSONString.Create(AValue);
end;

constructor TJSONPair.Create(const AKey: string; AValue: TJSONData);
begin
  Key := AKey;
  Value := AValue;
end;

destructor TJSONPair.Destroy;
begin
  Value.Free;
  inherited;
end;

{ TJSONObjectHelper }

function TJSONObjectHelper.AddPair(const AKey: string; const AValue: TJSONData): TJSONObject;
begin
  Add(AKey, AValue);
  Result := Self;
end;

function TJSONObjectHelper.AddPair(const AKey, AValue: string): TJSONObject;
begin
  Add(AKey, AValue);
  Result := Self;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: string): string;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsString
  else
    Result := ADefault;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: Integer): Integer;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsInteger
  else
    Result := ADefault;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: Int64): Int64;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsInt64
  else
    Result := ADefault;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: Double): Double;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsFloat
  else
    Result := ADefault;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: Boolean): Boolean;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsBoolean
  else
    Result := ADefault;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: TDateTime): TDateTime;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsFloat
  else
    Result := ADefault;
end;

function TJSONObjectHelper.GetValue(const AKey: string; const ADefault: TDate): TDate;
var
  D: TJSONData;
begin
  if Find(AKey, D) then
    Result := D.AsFloat
  else
    Result := ADefault;
end;

function ParseJSONValue(const S: string): TJSONData;
begin
  Result := GetJSON(S);
end;

function LerIni(const ASecao, AChave, AArquivo: string): string;
var
  Ini: TIniFile;
begin
  Result := '';
  if not FileExists(AArquivo) then
    Exit;
  Ini := TIniFile.Create(AArquivo);
  try
    Result := Ini.ReadString(ASecao, AChave, '');
  finally
    Ini.Free;
  end;
end;

function ConfigFile: string;
begin
  Result := ChangeFileExt(ParamStr(0), '.ini');
end;

function EndPath: string;
begin
  Result := ExtractFilePath(ParamStr(0));
end;

function NameEXE: string;
begin
  Result := ChangeFileExt(ExtractFileName(ParamStr(0)), '');
end;

function TryParseIsoDate(const AData: string; out AResult: TDateTime): Boolean;
var
  Y, M, D: Integer;
begin
  Result := False;
  if Length(AData) >= 10 then
  begin
    Y := StrToIntDef(Copy(AData, 1, 4), 0);
    M := StrToIntDef(Copy(AData, 6, 2), 0);
    D := StrToIntDef(Copy(AData, 9, 2), 0);
    if (Y > 1900) and (M in [1..12]) and (D in [1..31]) then
    begin
      AResult := EncodeDate(Y, M, D);
      Result := True;
    end;
  end;
end;

function Validar(const ASenha, AHash: string): Boolean;
begin
  Result := CompareStr(Criptografar(ASenha), AHash) = 0;
end;

function Criptografar(const AValor: string): string;
begin
  Result := '';
end;

procedure GravarLogJSON(const AUnit, ADescricao, AForm: string; AException: Exception);
begin

end;

function FieldToJSONValue(AField: TField): TJSONData;
begin
  if AField.IsNull then
    Result := TJSONNull.Create
  else
    case AField.DataType of
      ftSmallint, ftInteger, ftWord, ftAutoInc, ftLargeint:
        Result := TJSONIntegerNumber.Create(AField.AsInteger);
      ftBoolean:
        Result := TJSONIntegerNumber.Create(Ord(AField.AsBoolean));
      ftFloat, ftCurrency, ftBCD, ftFMTBcd:
        Result := TJSONFloatNumber.Create(AField.AsFloat);
      ftDate:
        Result := TJSONString.Create(FormatDateTime('yyyy-mm-dd', AField.AsDateTime));
      ftDateTime, ftTimeStamp:
        Result := TJSONString.Create(FormatDateTime('yyyy-mm-dd hh:nn:ss', AField.AsDateTime));
      ftTime:
        Result := TJSONString.Create(FormatDateTime('hh:nn:ss', AField.AsDateTime));
    else
      Result := TJSONString.Create(AField.AsString);
    end;
end;

function QueryToJSONArray(AQuery: TDataSet): TJSONArray;
var
  LObj: TJSONObject;
  I: Integer;
  LField: TField;
  LBookmark: TBookmark;
begin
  Result := TJSONArray.Create;
  if AQuery.IsEmpty then
    Exit;
  LBookmark := AQuery.Bookmark;
  try
    AQuery.First;
    while not AQuery.EOF do
    begin
      LObj := TJSONObject.Create;
      for I := 0 to AQuery.Fields.Count - 1 do
      begin
        LField := AQuery.Fields[I];
        LObj.AddPair(LField.FieldName, FieldToJSONValue(LField));
      end;
      Result.Add(LObj);
      AQuery.Next;
    end;
  finally
    AQuery.Bookmark := LBookmark;
  end;
end;

function QueryToJSONObject(AQuery: TDataSet): TJSONObject;
var
  I: Integer;
  LField: TField;
begin
  Result := TJSONObject.Create;
  if AQuery.IsEmpty then
    Exit;
  for I := 0 to AQuery.Fields.Count - 1 do
  begin
    LField := AQuery.Fields[I];
    Result.AddPair(LField.FieldName, FieldToJSONValue(LField));
  end;
end;

end.
