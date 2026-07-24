unit uDm;

{$mode Delphi}{$H+}

interface

uses
  Classes, SysUtils, ZConnection, ZDataset, ZAbstractRODataset;

type
  TDm = class(TDataModule)
    ZConnection: TZConnection;
    ZQuery1: TZQuery;
    ZTransaction: TZTransaction;
  private
  public
    function ConectarBanco: Boolean;
  end;

var
  Dm: TDm;

implementation

{$R *.lfm}

function TDm.ConectarBanco: Boolean;
begin
  Result := False;
  try
    if not ZConnection.Connected then
    begin
      ZConnection.Connect;
    end;
    Result := ZConnection.Connected;
  except
    Result := False;
  end;
end;

end.
